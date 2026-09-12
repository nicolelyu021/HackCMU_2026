import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { LLMJSONRequest, LLMProvider, LLMRequest, LLMStreamEvent } from '@pinlog/schema';
import { sleep } from '../util';

export interface ReplayOptions {
  /** record = always call the inner provider and save; replay = serve saved answers, call the inner provider (and save) on a miss. */
  mode: 'record' | 'replay';
  dir: string;
  /** Streaming replay pacing (ms per chunk); 0 in tests. */
  chunk_delay_ms?: number;
}

interface Recording {
  task: string;
  provider: string;
  created_at: string;
  text?: string;
  json?: unknown;
}

export function replayKey(req: LLMRequest & { schema_name?: string }): string {
  const material = JSON.stringify({
    task: req.task,
    system: req.system ?? null,
    messages: req.messages,
    inputs: req.inputs ?? null,
    schema_name: req.schema_name ?? null,
  });
  return createHash('sha256').update(material).digest('hex').slice(0, 20);
}

/**
 * Record real LLM answers under data/replays and serve them later without keys or network (docs/DEMO.md fallback
 * matrix). The key is the whole prompt, so an identical demo run replays; anything new goes live and is recorded.
 */
export function withReplay(inner: LLMProvider, opts: ReplayOptions): LLMProvider {
  const chunkDelay = opts.chunk_delay_ms ?? 12;
  const fileFor = (req: LLMRequest & { schema_name?: string }) =>
    join(opts.dir, req.task, `${replayKey(req)}.json`);

  const load = async (req: LLMRequest & { schema_name?: string }): Promise<Recording | null> => {
    if (opts.mode !== 'replay') return null;
    try {
      return JSON.parse(await readFile(fileFor(req), 'utf8')) as Recording;
    } catch {
      return null;
    }
  };
  const save = async (
    req: LLMRequest & { schema_name?: string },
    rec: Omit<Recording, 'task' | 'provider' | 'created_at'>,
  ) => {
    const path = fileFor(req);
    await mkdir(dirname(path), { recursive: true });
    const full: Recording = {
      task: req.task,
      provider: inner.name,
      created_at: new Date().toISOString(),
      ...rec,
    };
    await writeFile(path, JSON.stringify(full, null, 2));
  };

  return {
    name: `replay(${inner.name})`,
    async complete(req) {
      const hit = await load(req);
      if (hit?.text !== undefined) return { text: hit.text };
      const out = await inner.complete(req);
      await save(req, { text: out.text });
      return out;
    },
    async completeJSON<T>(req: LLMJSONRequest<T>) {
      const hit = await load(req);
      if (hit && hit.json !== undefined) return req.schema.parse(hit.json);
      const out = await inner.completeJSON(req);
      await save(req, { json: out });
      return out;
    },
    async *stream(req, signal): AsyncIterable<LLMStreamEvent> {
      const hit = await load(req);
      if (hit?.text !== undefined) {
        const words = hit.text.split(/(\s+)/).filter(Boolean);
        for (let i = 0; i < words.length; i += 2) {
          if (signal?.aborted) return;
          const chunk = words.slice(i, i + 2).join('');
          yield { type: 'delta', text: chunk };
          if (chunkDelay > 0) await sleep(chunkDelay, signal).catch(() => undefined);
        }
        yield { type: 'done', text: hit.text };
        return;
      }
      let full = '';
      for await (const ev of inner.stream(req, signal)) {
        if (ev.type === 'done') full = ev.text;
        yield ev;
      }
      if (full) await save(req, { text: full });
    },
  };
}

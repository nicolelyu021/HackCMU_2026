import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ItineraryDraft, type LLMProvider, type LLMStreamEvent } from '@pinlog/schema';
import { createLLM, createMockLLM, withFallback, withReplay } from '../src/index';

const collect = async (it: AsyncIterable<LLMStreamEvent>) => {
  const out: LLMStreamEvent[] = [];
  for await (const ev of it) out.push(ev);
  return out;
};
const boom: LLMProvider = {
  name: 'boom',
  complete: async () => {
    throw new Error('offline');
  },
  completeJSON: async () => {
    throw new Error('offline');
  },
  // eslint-disable-next-line require-yield
  async *stream() {
    throw new Error('offline');
  },
};

describe('llm wrappers', () => {
  let dir = '';
  afterAll(async () => dir && (await rm(dir, { recursive: true, force: true })));

  it('mock answers by task and validates JSON against the schema', async () => {
    const llm = createMockLLM({ mock_delay_ms: 0 });
    const draft = await llm.completeJSON({
      task: 'plan',
      schema: ItineraryDraft,
      schema_name: 'x',
      messages: [],
      inputs: { days: 1 },
    });
    expect(draft.days).toHaveLength(1);
    const events = await collect(
      llm.stream({ task: 'chat', messages: [], inputs: { summary: 'two pins' } }),
    );
    expect(events.at(-1)).toMatchObject({ type: 'done' });
    expect((events.at(-1) as { text: string }).text).toContain('two pins');
  });

  it('records with the inner provider, then replays without it', async () => {
    dir = await mkdtemp(join(tmpdir(), 'pinlog-replay-'));
    const rec = withReplay(createMockLLM({ mock_delay_ms: 0 }), { mode: 'record', dir });
    const req = {
      task: 'summary' as const,
      system: 's',
      messages: [{ role: 'user' as const, content: 'Summarize' }],
      inputs: { pins: 'a to b', note: '"x"' },
    };
    const first = await rec.complete(req);
    const files = await readdir(join(dir, 'summary'));
    expect(files).toHaveLength(1);
    const rep = withReplay(boom, { mode: 'replay', dir, chunk_delay_ms: 0 });
    expect(rep.name).toBe('replay(boom)');
    expect(await rep.complete(req)).toEqual(first);
    const streamed = await collect(rep.stream(req));
    expect((streamed.at(-1) as { text: string }).text).toBe(first.text);
    // a miss in replay mode goes to the inner provider (which is offline here)
    await expect(
      rep.complete({ ...req, messages: [{ role: 'user', content: 'other' }] }),
    ).rejects.toThrow(/offline/);
    // json round trip
    const recJson = withReplay(createMockLLM({ mock_delay_ms: 0 }), { mode: 'record', dir });
    const jreq = {
      task: 'plan' as const,
      schema: ItineraryDraft,
      schema_name: 'itinerary_draft',
      messages: [],
      inputs: { days: 2 },
    };
    const drafted = await recJson.completeJSON(jreq);
    expect(await withReplay(boom, { mode: 'replay', dir }).completeJSON(jreq)).toEqual(drafted);
  });

  it('falls back to the mock when the live provider fails', async () => {
    const lines: string[] = [];
    const llm = withFallback(boom, createMockLLM({ mock_delay_ms: 0 }), (l) => lines.push(l));
    expect((await llm.complete({ task: 'caption', messages: [] })).text).toMatch(/travel photo/);
    const events = await collect(llm.stream({ task: 'chat', messages: [], inputs: {} }));
    expect(events.at(-1)?.type).toBe('done');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/boom failed for task=caption → using mock/);
  });

  it('createLLM wiring', () => {
    expect(createLLM('mock').name).toBe('mock');
    expect(() => createLLM('anthropic')).toThrow(/api_key/);
    expect(createLLM('anthropic', { api_key: 'sk-test' }).name).toBe('anthropic');
    expect(
      createLLM('anthropic', { api_key: 'sk-test', replay: 'replay', replay_dir: '/tmp/x' }).name,
    ).toBe('replay(anthropic)');
  });
});

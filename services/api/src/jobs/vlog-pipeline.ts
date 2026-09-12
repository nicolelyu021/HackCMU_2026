import { generateScript } from '@pinlog/ai';
import {
  SEGMENT_PADDING_S,
  segmentDurationFromAudio,
  storageKeys,
  type Ports,
  type Vlog,
  type VlogScript,
} from '@pinlog/schema';
import { estimateSpeechSeconds, silentWav } from '@pinlog/tts';

/**
 * Owner D. In-process vlog job: queued → scripting → tts → done | failed (docs/ARCHITECTURE.md "One-tap vlog").
 * Single-flight per trip; a failure lands in vlogs.error, never a crash. TTS errors fall back to a silent WAV of
 * estimated length so captions still carry the story (docs/DEMO.md fallback matrix).
 */
export interface VlogJobOptions {
  /** Reuse this script instead of generating one (PUT /vlogs/:id/script re-runs TTS only). */
  script?: VlogScript;
  previous?: VlogScript | null;
  log?: (line: string) => void;
  /** Parallel TTS calls. */
  concurrency?: number;
}

const running = new Map<string, Promise<Vlog>>(); // trip_id → job

export function isVlogJobRunning(trip_id: string): boolean {
  return running.has(trip_id);
}

/** Awaits the job for tests; production callers fire-and-forget (the route returns 202 immediately). */
export function runVlogPipeline(
  ports: Pick<Ports, 'repo' | 'llm' | 'tts' | 'storage'>,
  vlog: Vlog,
  opts: VlogJobOptions = {},
): Promise<Vlog> {
  const existing = running.get(vlog.trip_id);
  if (existing) return existing;
  const p = execute(ports, vlog, opts).finally(() => running.delete(vlog.trip_id));
  running.set(vlog.trip_id, p);
  return p;
}

async function execute(
  ports: Pick<Ports, 'repo' | 'llm' | 'tts' | 'storage'>,
  vlog: Vlog,
  opts: VlogJobOptions,
): Promise<Vlog> {
  const log = opts.log ?? ((l: string) => console.log(`[vlog ${vlog.id}] ${l}`));
  const { repo } = ports;
  try {
    let script = opts.script;
    if (!script) {
      await repo.vlogs.update(vlog.id, { status: 'scripting', error: null });
      log('scripting');
      script = await generateScript(ports, vlog.trip_id, vlog.settings, {
        previous: opts.previous ?? null,
      });
    }
    await repo.vlogs.update(vlog.id, { status: 'tts', script });
    log(
      `tts: ${script.segments.filter((s) => s.type === 'pin').length} segments via ${ports.tts.name}`,
    );
    const voiced = await synthesizeAll(ports, vlog.id, script, opts.concurrency ?? 3, log);
    const duration_s = Math.round(voiced.segments.reduce((s, x) => s + x.duration_s, 0) * 10) / 10;
    const done = await repo.vlogs.update(vlog.id, {
      status: 'done',
      script: voiced,
      duration_s,
      error: null,
    });
    log(`done: ${duration_s} s`);
    return done;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`failed: ${message}`);
    return repo.vlogs.update(vlog.id, { status: 'failed', error: message });
  }
}

/** Every pin segment gets vlogs/<id>/seg_<index>.wav; duration_s = measured audio + padding (min 3 s). */
export async function synthesizeAll(
  ports: Pick<Ports, 'tts' | 'storage'>,
  vlog_id: string,
  script: VlogScript,
  concurrency: number,
  log: (line: string) => void,
): Promise<VlogScript> {
  const segments = script.segments.map((s) => ({ ...s }));
  const jobs = segments
    .map((seg, index) => ({ seg, index }))
    .filter(
      (x): x is { seg: Extract<VlogScript['segments'][number], { type: 'pin' }>; index: number } =>
        x.seg.type === 'pin',
    );
  let cursor = 0;
  const worker = async () => {
    while (cursor < jobs.length) {
      const { seg, index } = jobs[cursor++]!;
      const key = storageKeys.segmentAudio(vlog_id, index);
      let audio: Uint8Array;
      let seconds: number;
      if (!seg.narration.trim()) {
        seconds = 2;
        audio = silentWav(seconds, 8000);
      } else {
        try {
          const r = await ports.tts.synthesize({
            text: seg.narration,
            voice: script.voice,
            language: script.trip.language,
          });
          audio = r.audio;
          seconds = r.duration_s;
        } catch (err) {
          seconds = estimateSpeechSeconds(seg.narration);
          audio = silentWav(seconds, 8000);
          log(
            `tts failed for segment ${index} → silent ${seconds}s: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
      await ports.storage.put(key, audio, 'audio/wav');
      seg.audio_path = key;
      seg.duration_s = segmentDurationFromAudio(seconds);
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, jobs.length)) }, worker),
  );
  return { ...script, segments };
}

export { SEGMENT_PADDING_S };

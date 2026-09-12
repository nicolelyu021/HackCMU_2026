import type { LLMJSONRequest, LLMProvider, LLMStreamEvent } from '@pinlog/schema';

/**
 * On any error (timeout, 4xx/5xx, refusal) from `primary`, answer with `fallback` (the mock) and log once —
 * docs/DEMO.md: the app never crashes for lack of a provider. A stream that already produced text is not restarted.
 */
export function withFallback(
  primary: LLMProvider,
  fallback: LLMProvider,
  log: (line: string) => void = (l) => console.warn(`[llm] ${l}`),
): LLMProvider {
  const note = (task: string, err: unknown) =>
    log(
      `${primary.name} failed for task=${task} → using ${fallback.name}: ${err instanceof Error ? err.message : String(err)}`,
    );
  return {
    name: primary.name,
    async complete(req) {
      try {
        return await primary.complete(req);
      } catch (err) {
        note(req.task, err);
        return fallback.complete(req);
      }
    },
    async completeJSON<T>(req: LLMJSONRequest<T>) {
      try {
        return await primary.completeJSON(req);
      } catch (err) {
        note(req.task, err);
        return fallback.completeJSON(req);
      }
    },
    async *stream(req, signal): AsyncIterable<LLMStreamEvent> {
      let started = false;
      try {
        for await (const ev of primary.stream(req, signal)) {
          started = true;
          yield ev;
        }
        return;
      } catch (err) {
        if (started || signal?.aborted) throw err;
        note(req.task, err);
      }
      yield* fallback.stream(req, signal);
    },
  };
}

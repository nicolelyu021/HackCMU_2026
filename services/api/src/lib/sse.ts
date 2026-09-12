import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';

/**
 * Stream an async iterable of typed events as SSE ("event: <type>\ndata: <json>\n\n").
 * If the source throws, an `error` event is sent instead of a broken stream.
 */
export function sse<T extends { type: string }>(c: Context, source: AsyncIterable<T>): Response {
  return streamSSE(
    c,
    async (stream) => {
      for await (const ev of source) {
        await stream.writeSSE({ event: ev.type, data: JSON.stringify(ev) });
      }
    },
    async (err, stream) => {
      console.error('[sse]', err);
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ type: 'error', message: err.message }),
      });
    },
  );
}

/** Aborts when the client disconnects; pass to LLM streams. */
export function requestSignal(c: Context): AbortSignal {
  return c.req.raw.signal;
}

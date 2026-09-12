import { z } from 'zod';
import { Id } from './common';
import { Itinerary, ItineraryStop } from './itinerary';
import { Pin } from './pin';

// ---- Server-sent events shared by the API (producer) and the web client + tests (consumers) ----
// Wire format: "event: <type>\ndata: <JSON of the whole event>\n\n", content-type text/event-stream.
// The web client uses fetch + parseSSE (EventSource is GET-only and we POST).

/** POST /pins/:id/ask and POST /trips/:id/chat */
export const AskEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), text: z.string() }),
  z.object({ type: z.literal('tool_call'), name: z.string(), input: z.unknown() }),
  z.object({ type: z.literal('tool_result'), name: z.string(), summary: z.string() }),
  /** Full assistant text, already persisted as a Message. */
  z.object({ type: z.literal('done'), message_id: Id, content: z.string() }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);
export type AskEvent = z.infer<typeof AskEvent>;

/** POST /trips/:id/plan — pins stream onto the map while the planner works. */
export const PlanEvent = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('status'),
    stage: z.enum(['drafting', 'resolving', 'ordering', 'saving']),
    detail: z.string().optional(),
  }),
  /** A verified stop (provisional marker); replaced by the persisted pins in `done`. */
  z.object({ type: z.literal('stop'), day_index: z.number().int().min(1), stop: ItineraryStop }),
  /** A drafted place that could not be verified and was dropped. */
  z.object({ type: z.literal('warning'), name: z.string(), reason: z.string() }),
  z.object({
    type: z.literal('done'),
    itinerary: Itinerary,
    pins: z.array(Pin),
    dropped: z.array(z.string()),
  }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);
export type PlanEvent = z.infer<typeof PlanEvent>;

export function encodeSSE(ev: { type: string }): string {
  return `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`;
}

/** Parse a complete SSE text (tests, non-streaming clients). */
export function parseSSEText<T = unknown>(text: string): T[] {
  const out: T[] = [];
  for (const block of text.split(/\n\n/)) {
    const data = block
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trimStart())
      .join('\n');
    if (data) out.push(JSON.parse(data) as T);
  }
  return out;
}

/** Async-iterate the events of a streaming Response body. */
export async function* parseSSE<T = unknown>(
  body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<T, void, undefined> {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const events = parseSSEText<T>(block + '\n\n');
        for (const ev of events) yield ev;
      }
    }
    if (buffer.trim()) for (const ev of parseSSEText<T>(buffer + '\n\n')) yield ev;
  } finally {
    reader.releaseLock();
  }
}

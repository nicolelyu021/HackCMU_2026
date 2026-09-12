import { describe, expect, it } from 'vitest';
import { AskEvent, PlanEvent, encodeSSE, parseSSE, parseSSEText } from '../src/index';

describe('SSE wire format', () => {
  it('round-trips events through encode → parseSSEText', () => {
    const events: AskEvent[] = [
      { type: 'delta', text: 'Hel' },
      { type: 'delta', text: 'lo\nworld' },
      { type: 'done', message_id: 'm1', content: 'Hello\nworld' },
    ];
    const text = events.map(encodeSSE).join('');
    expect(text).toContain('event: delta\ndata: ');
    const parsed = parseSSEText<AskEvent>(text);
    expect(parsed).toEqual(events);
    parsed.forEach((e) => AskEvent.parse(e));
  });

  it('parses a chunked ReadableStream regardless of chunk boundaries', async () => {
    const events: PlanEvent[] = [
      { type: 'status', stage: 'drafting' },
      { type: 'warning', name: 'Skyline Sky Lounge', reason: 'no match' },
      { type: 'error', message: 'boom' },
    ];
    const text = events.map(encodeSSE).join('');
    const bytes = new TextEncoder().encode(text);
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < bytes.length; i += 7) chunks.push(bytes.slice(i, i + 7));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((c) => controller.enqueue(c));
        controller.close();
      },
    });
    const out: PlanEvent[] = [];
    for await (const ev of parseSSE<PlanEvent>(stream)) out.push(PlanEvent.parse(ev));
    expect(out).toEqual(events);
  });
});

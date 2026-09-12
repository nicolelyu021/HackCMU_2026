import type { LLMProvider, LLMRequest, LLMStreamEvent } from '@pinlog/schema';
import { mockAnswers, mockPlanDraft, mockReplanDraft } from '@pinlog/schema/fixtures';
import { mockScriptDraft, type TimelinePin } from '../script';
import { clockOf, sleep } from '../util';

export interface MockLLMOptions {
  /** Delay between streamed words (ms); 0 in tests. */
  mock_delay_ms?: number;
}

type Inputs = Record<string, unknown>;
const inputsOf = (req: LLMRequest): Inputs =>
  req.inputs && typeof req.inputs === 'object' ? (req.inputs as Inputs) : {};
const str = (v: unknown, fallback: string) => (typeof v === 'string' && v ? v : fallback);

/** Canned, context-aware answers by task. Uses `req.inputs` (the structured copy of the prompt) to sound sensible. */
export function mockAnswerText(req: LLMRequest): string {
  const i = inputsOf(req);
  switch (req.task) {
    case 'ask': {
      const pin = (i.pin ?? {}) as { planned_start?: string | null; planned_end?: string | null };
      const notes = Array.isArray(i.notes) ? (i.notes as string[]) : [];
      return mockAnswers.ask
        .replace('{start}', clockOf(pin.planned_start) ?? 'the morning')
        .replace('{end}', clockOf(pin.planned_end) ?? 'the afternoon')
        .replace('{note}', notes[0] ? `"${notes[0]}"` : 'you have not written a note here yet.');
    }
    case 'chat':
      return mockAnswers.chat.replace('{summary}', str(i.summary, 'nothing written yet.'));
    case 'summary':
      return mockAnswers.summary
        .replace('{pins}', str(i.pins, 'nowhere in particular'))
        .replace('{note}', str(i.note, 'no notes yet.'));
    case 'caption':
      return mockAnswers.caption;
    case 'plan':
      return JSON.stringify(mockPlanDraft(Number(i.days ?? 2)));
    case 'replan':
      return JSON.stringify(mockReplanFor(i));
    case 'script':
      return JSON.stringify(mockScriptDraft((i.timeline as TimelinePin[] | undefined) ?? [], i));
  }
}

function mockReplanFor(i: Inputs): unknown {
  const pins = Array.isArray(i.pins) ? (i.pins as { id: string }[]) : [];
  const knows = new Set(pins.map((p) => p.id));
  if (knows.has('pin_pgh_d2_schenley') && knows.has('pin_pgh_d2_strip')) return mockReplanDraft;
  return { summary: 'Mock replan: nothing to change.', added: [], changed: [], removed: [] };
}

export function createMockLLM(opts: MockLLMOptions = {}): LLMProvider {
  const delay = opts.mock_delay_ms ?? 25;
  return {
    name: 'mock',
    async complete(req) {
      return { text: mockAnswerText(req) };
    },
    async completeJSON(req) {
      const i = inputsOf(req);
      const obj =
        req.task === 'plan'
          ? mockPlanDraft(Number(i.days ?? 2))
          : req.task === 'replan'
            ? mockReplanFor(i)
            : req.task === 'script'
              ? mockScriptDraft((i.timeline as TimelinePin[] | undefined) ?? [], i)
              : JSON.parse(mockAnswerText(req));
      return req.schema.parse(obj);
    },
    async *stream(req, signal): AsyncIterable<LLMStreamEvent> {
      const text = mockAnswerText(req);
      const words = text.split(/(\s+)/).filter(Boolean);
      let acc = '';
      for (const w of words) {
        if (signal?.aborted) return;
        acc += w;
        yield { type: 'delta', text: w };
        if (delay > 0 && /\S/.test(w)) await sleep(delay, signal).catch(() => undefined);
      }
      yield { type: 'done', text: acc };
    },
  };
}

// Owner C — public surface of @pinlog/ai. Signatures are part of the frozen contract (services/api uses them).
import type { LLMProvider, LLMTask, PlacesProvider } from '@pinlog/schema';
import { createAnthropicLLM } from './llm/anthropic';
import { withFallback } from './llm/fallback';
import { createMockLLM } from './llm/mock';
import { withReplay } from './llm/replay';
import { createMockPlaces } from './places/mock';
import { createNominatimPlaces } from './places/nominatim';

export type LLMKind = 'mock' | 'anthropic';
export interface LLMOptions {
  api_key?: string;
  model?: string;
  /** Record real responses to replay_dir / replay them without keys. */
  replay?: 'off' | 'record' | 'replay';
  replay_dir?: string;
  /** Mock streaming delay between words (ms); 0 in tests. */
  mock_delay_ms?: number;
  /** Live only: per-task request timeouts (ms). */
  timeouts_ms?: Partial<Record<LLMTask, number>>;
  /** Live only: answer with the mock when the live provider fails (default true — the demo never dies on a 5xx). */
  fallback_to_mock?: boolean;
}

export function createLLM(kind: LLMKind, opts: LLMOptions = {}): LLMProvider {
  if (kind === 'mock') return createMockLLM({ mock_delay_ms: opts.mock_delay_ms });
  if (!opts.api_key) throw new Error('createLLM("anthropic") needs api_key (ANTHROPIC_API_KEY)');
  let llm: LLMProvider = createAnthropicLLM({
    api_key: opts.api_key,
    model: opts.model,
    timeouts_ms: opts.timeouts_ms,
  });
  if (opts.fallback_to_mock ?? true) llm = withFallback(llm, createMockLLM({ mock_delay_ms: 10 }));
  if (opts.replay && opts.replay !== 'off') {
    if (!opts.replay_dir) throw new Error('replay needs replay_dir');
    llm = withReplay(llm, { mode: opts.replay, dir: opts.replay_dir });
  }
  return llm;
}

export type PlacesKind = 'mock' | 'nominatim';
export interface PlacesOptions {
  email?: string;
}
export function createPlaces(kind: PlacesKind, opts: PlacesOptions = {}): PlacesProvider {
  return kind === 'mock' ? createMockPlaces() : createNominatimPlaces({ email: opts.email });
}

export { plan, PLANNER_SYSTEM, planPrompt, resolveStop } from './planner';
export { replan, REPLAN_SYSTEM } from './replan';
export { ask, chat, summarize, ASK_SYSTEM, CHAT_SYSTEM, SUMMARY_SYSTEM } from './ask';
export type { AskOptions } from './ask';
export { caption, CAPTION_SYSTEM } from './caption';
export {
  generateScript,
  assembleScript,
  buildTimeline,
  mockScriptDraft,
  scriptPrompt,
  wordBudget,
  cameraFor,
  ScriptDraft,
  ScriptDraftSegment,
  SCRIPT_SYSTEM,
} from './script';
export type { TimelinePin } from './script';
export {
  describePinContext,
  describeTimeline,
  describeTrip,
  dayIndexForNow,
  collectNotes,
} from './context';
export { createMockLLM, mockAnswerText } from './llm/mock';
export { createAnthropicLLM, DEFAULT_TIMEOUTS_MS } from './llm/anthropic';
export { withReplay, replayKey } from './llm/replay';
export { withFallback } from './llm/fallback';
export { createMockPlaces } from './places/mock';
export {
  createNominatimPlaces,
  parseNominatimGeocode,
  parseNominatimPlaces,
} from './places/nominatim';
export { estimateSpeechSeconds, firstSentences, splitSentences, wordCount } from './util';

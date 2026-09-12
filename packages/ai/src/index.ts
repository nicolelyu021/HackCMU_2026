// Owner C — public surface of @pinlog/ai. Signatures are part of the frozen contract; implementations are C's.
import type {
  AskEvent,
  AskRequest,
  ChatRequest,
  LLMProvider,
  PlacesProvider,
  PlanEvent,
  PlanRequest,
  Ports,
  ReplanRequest,
  ReplanResponse,
  SummaryRequest,
  SummaryResponse,
  Trip,
  VlogScript,
  VlogSettings,
} from '@pinlog/schema';

export type LLMKind = 'mock' | 'anthropic';
export interface LLMOptions {
  api_key?: string;
  model?: string;
  /** Record real responses to replay_dir / replay them without keys. */
  replay?: 'off' | 'record' | 'replay';
  replay_dir?: string;
  /** Mock streaming delay between words (ms); 0 in tests. */
  mock_delay_ms?: number;
}
export function createLLM(_kind: LLMKind, _opts: LLMOptions = {}): LLMProvider {
  throw new Error('TODO(C): createLLM not implemented');
}

export type PlacesKind = 'mock' | 'nominatim';
export interface PlacesOptions {
  email?: string;
}
export function createPlaces(_kind: PlacesKind, _opts: PlacesOptions = {}): PlacesProvider {
  throw new Error('TODO(C): createPlaces not implemented');
}

export interface AskOptions {
  /** Trip-local "now" (NaiveDateTime); defaults to the machine clock. */
  now?: string;
  signal?: AbortSignal;
}

/** Streams the itinerary as it is drafted and verified; persists pins in one transaction before `done`. */
export function plan(
  _ports: Pick<Ports, 'repo' | 'llm' | 'places'>,
  _trip: Trip,
  _req: PlanRequest,
  _signal?: AbortSignal,
): AsyncIterable<PlanEvent> {
  throw new Error('TODO(C): plan not implemented');
}
export async function replan(
  _ports: Pick<Ports, 'repo' | 'llm' | 'places'>,
  _trip: Trip,
  _req: ReplanRequest,
): Promise<ReplanResponse> {
  throw new Error('TODO(C): replan not implemented');
}
export function ask(
  _ports: Pick<Ports, 'repo' | 'llm'>,
  _pin_id: string,
  _req: AskRequest,
  _opts: AskOptions = {},
): AsyncIterable<AskEvent> {
  throw new Error('TODO(C): ask not implemented');
}
export function chat(
  _ports: Pick<Ports, 'repo' | 'llm'>,
  _trip_id: string,
  _req: ChatRequest,
  _opts: AskOptions = {},
): AsyncIterable<AskEvent> {
  throw new Error('TODO(C): chat not implemented');
}
export async function summarize(
  _ports: Pick<Ports, 'repo' | 'llm'>,
  _trip_id: string,
  _req: SummaryRequest,
  _opts: AskOptions = {},
): Promise<SummaryResponse> {
  throw new Error('TODO(C): summarize not implemented');
}
export async function caption(
  _ports: Pick<Ports, 'llm'>,
  _image: { bytes: Uint8Array; mime: 'image/jpeg' | 'image/png' | 'image/webp' },
): Promise<string> {
  throw new Error('TODO(C): caption not implemented');
}
export async function generateScript(
  _ports: Pick<Ports, 'repo' | 'llm'>,
  _trip_id: string,
  _settings: VlogSettings,
  _opts: { previous?: VlogScript | null } = {},
): Promise<VlogScript> {
  throw new Error('TODO(C): generateScript not implemented');
}

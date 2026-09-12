import {
  parseSSE,
  type AskEvent,
  type CreateEntryInput,
  type CreatePinInput,
  type CreateTripInput,
  type Entry,
  type Health,
  type Media,
  type Message,
  type Pin,
  type PlanEvent,
  type PlanRequest,
  type ReplanResponse,
  type ReorderPinsInput,
  type SummaryResponse,
  type Trip,
  type TripBundle,
  type UpdateMediaInput,
  type UpdatePinInput,
  type UpdateTripInput,
  type UploadMediaMeta,
  type UploadMediaResponse,
  type Vlog,
  type VlogSettings,
} from '@pinlog/schema';
import { API_URL, FILES_BASE_URL, isFixtureMode } from './config';
import * as fixture from './fixture';

/** Typed client for services/api (docs/CONTRACTS.md). Every call throws ApiClientError with the server's envelope. */
export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch (err) {
    throw new ApiClientError(
      0,
      'network',
      `API unreachable at ${API_URL} — is \`pnpm dev:api\` running? (${err instanceof Error ? err.message : err})`,
    );
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const e = body?.error ?? {};
    throw new ApiClientError(
      res.status,
      e.code ?? 'internal',
      e.message ?? res.statusText,
      e.details,
    );
  }
  return body as T;
}
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

/** POST that streams SSE events; resolves when the stream ends. Aborting the signal stops the model. */
async function streamPost<T extends { type: string }>(
  path: string,
  body: unknown,
  onEvent: (ev: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { ...json('POST', body), signal });
  if (!res.ok) {
    const b = await res.json().catch(() => null);
    throw new ApiClientError(
      res.status,
      b?.error?.code ?? 'internal',
      b?.error?.message ?? res.statusText,
    );
  }
  for await (const ev of parseSSE<T>(res.body)) onEvent(ev);
}

export const fileUrl = (key: string) => `${FILES_BASE_URL}/${key}`;

export const api = {
  health: (): Promise<Health> => (isFixtureMode() ? fixture.health() : request('/health')),

  listTrips: (): Promise<Trip[]> =>
    isFixtureMode()
      ? fixture.listTrips()
      : request<{ trips: Trip[] }>('/trips').then((r) => r.trips),
  createTrip: (input: CreateTripInput): Promise<Trip> =>
    isFixtureMode() ? fixture.readOnly() : request('/trips', json('POST', input)),
  getBundle: (id: string): Promise<TripBundle> =>
    isFixtureMode() ? fixture.getBundle(id) : request(`/trips/${id}`),
  updateTrip: (id: string, patch: UpdateTripInput): Promise<Trip> =>
    isFixtureMode() ? fixture.readOnly() : request(`/trips/${id}`, json('PATCH', patch)),
  deleteTrip: (id: string): Promise<void> =>
    isFixtureMode() ? fixture.readOnly() : request(`/trips/${id}`, { method: 'DELETE' }),

  plan: (
    tripId: string,
    req: PlanRequest,
    onEvent: (ev: PlanEvent) => void,
    signal?: AbortSignal,
  ) =>
    isFixtureMode()
      ? fixture.readOnly()
      : streamPost<PlanEvent>(`/trips/${tripId}/plan`, req, onEvent, signal),
  replan: (tripId: string, instruction: string): Promise<ReplanResponse> =>
    isFixtureMode()
      ? fixture.readOnly()
      : request(`/trips/${tripId}/replan`, json('POST', { instruction })),

  createPin: (tripId: string, input: CreatePinInput): Promise<Pin> =>
    isFixtureMode() ? fixture.readOnly() : request(`/trips/${tripId}/pins`, json('POST', input)),
  updatePin: (pinId: string, patch: UpdatePinInput): Promise<Pin> =>
    isFixtureMode() ? fixture.readOnly() : request(`/pins/${pinId}`, json('PATCH', patch)),
  deletePin: (pinId: string): Promise<void> =>
    isFixtureMode() ? fixture.readOnly() : request(`/pins/${pinId}`, { method: 'DELETE' }),
  reorderPins: (tripId: string, order: ReorderPinsInput['order']): Promise<Pin[]> =>
    isFixtureMode()
      ? fixture.readOnly()
      : request<{ pins: Pin[] }>(`/trips/${tripId}/pins/order`, json('PUT', { order })).then(
          (r) => r.pins,
        ),

  createPinEntry: (pinId: string, input: CreateEntryInput): Promise<Entry> =>
    isFixtureMode() ? fixture.readOnly() : request(`/pins/${pinId}/entries`, json('POST', input)),
  createTripEntry: (tripId: string, input: CreateEntryInput): Promise<Entry> =>
    isFixtureMode() ? fixture.readOnly() : request(`/trips/${tripId}/entries`, json('POST', input)),
  deleteEntry: (id: string): Promise<void> =>
    isFixtureMode() ? fixture.readOnly() : request(`/entries/${id}`, { method: 'DELETE' }),

  /** Upload one batch (the caller batches by 4). meta[i] describes files[i]. */
  uploadMedia: async (
    tripId: string,
    files: File[],
    metas: UploadMediaMeta[],
  ): Promise<UploadMediaResponse> => {
    if (isFixtureMode()) return fixture.readOnly();
    const form = new FormData();
    for (const f of files) form.append('files', f, f.name);
    form.append('meta', JSON.stringify(metas));
    return request(`/trips/${tripId}/media`, { method: 'POST', body: form });
  },
  updateMedia: (id: string, patch: UpdateMediaInput): Promise<Media> =>
    isFixtureMode() ? fixture.readOnly() : request(`/media/${id}`, json('PATCH', patch)),
  deleteMedia: (id: string): Promise<void> =>
    isFixtureMode() ? fixture.readOnly() : request(`/media/${id}`, { method: 'DELETE' }),

  ask: (pinId: string, question: string, onEvent: (ev: AskEvent) => void, signal?: AbortSignal) =>
    isFixtureMode()
      ? fixture.streamCanned(onEvent)
      : streamPost<AskEvent>(`/pins/${pinId}/ask`, { question }, onEvent, signal),
  pinMessages: (pinId: string): Promise<Message[]> =>
    isFixtureMode()
      ? fixture.pinMessages(pinId)
      : request<{ messages: Message[] }>(`/pins/${pinId}/messages`).then((r) => r.messages),
  chat: (tripId: string, message: string, onEvent: (ev: AskEvent) => void, signal?: AbortSignal) =>
    isFixtureMode()
      ? fixture.streamCanned(onEvent)
      : streamPost<AskEvent>(`/trips/${tripId}/chat`, { message }, onEvent, signal),
  tripMessages: (tripId: string): Promise<Message[]> =>
    isFixtureMode()
      ? fixture.tripMessages(tripId)
      : request<{ messages: Message[] }>(`/trips/${tripId}/messages`).then((r) => r.messages),
  summarize: (tripId: string, day_index?: number): Promise<SummaryResponse> =>
    isFixtureMode()
      ? fixture.summarize()
      : request(`/trips/${tripId}/summary`, json('POST', day_index ? { day_index } : {})),

  createVlog: (tripId: string, settings: Partial<VlogSettings>): Promise<Vlog> =>
    isFixtureMode() ? fixture.readOnly() : request(`/trips/${tripId}/vlog`, json('POST', settings)),
  getVlog: (id: string): Promise<Vlog> =>
    isFixtureMode() ? fixture.getVlog(id) : request(`/vlogs/${id}`),
  listVlogs: (tripId: string): Promise<Vlog[]> =>
    isFixtureMode()
      ? fixture.listVlogs(tripId)
      : request<{ vlogs: Vlog[] }>(`/trips/${tripId}/vlogs`).then((r) => r.vlogs),
  regenerateVlog: (id: string, instructions: string): Promise<Vlog> =>
    isFixtureMode()
      ? fixture.readOnly()
      : request(`/vlogs/${id}/regenerate`, json('POST', { instructions })),
  shareTrip: (tripId: string): Promise<Trip> =>
    isFixtureMode() ? fixture.readOnly() : request(`/trips/${tripId}/share`, { method: 'POST' }),
};
export type Api = typeof api;

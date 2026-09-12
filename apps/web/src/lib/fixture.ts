import type { AskEvent, Health, Message, Trip, TripBundle, Vlog } from '@pinlog/schema';
import {
  DEMO_TRIP_ID,
  DEMO_VLOG_ID,
  demoBundle,
  demoMessages,
  demoVlog,
} from '@pinlog/schema/fixtures';
import { ApiClientError } from './api';

// Read-only browser fixture mode (?fixture=1): the frozen demo trip, no API. Mutations explain themselves.

export const health = async (): Promise<Health> => ({
  ok: true,
  mode: 'mock',
  providers: { llm: 'fixture', places: 'fixture', tts: 'fixture' },
  version: 'fixture',
  files_base_url: '',
  map_style_url: 'https://tiles.openfreemap.org/styles/liberty',
});
export const listTrips = async (): Promise<Trip[]> => [demoBundle().trip];
export const getBundle = async (id: string): Promise<TripBundle> => {
  if (id !== DEMO_TRIP_ID)
    throw new ApiClientError(
      404,
      'not_found',
      `trip ${id} not found (fixture mode only knows ${DEMO_TRIP_ID})`,
    );
  return demoBundle();
};
export const pinMessages = async (pinId: string): Promise<Message[]> =>
  demoMessages.filter((m) => m.pin_id === pinId);
export const tripMessages = async (tripId: string): Promise<Message[]> =>
  demoMessages.filter((m) => m.trip_id === tripId && m.pin_id === null);
export const listVlogs = async (tripId: string): Promise<Vlog[]> =>
  tripId === DEMO_TRIP_ID ? [demoVlog()] : [];
export const getVlog = async (id: string): Promise<Vlog> => {
  if (id !== DEMO_VLOG_ID) throw new ApiClientError(404, 'not_found', `vlog ${id} not found`);
  return demoVlog();
};
export const summarize = async () => ({
  summary:
    'Fixture mode: run `pnpm dev:api` for real summaries. Today went from the Cathedral to the Warhol. From your notes: the elephant sculpture stopped you in the doorway.',
  day_index: 1,
  message_id: 'fixture',
});
export async function streamCanned(onEvent: (ev: AskEvent) => void): Promise<void> {
  const text =
    'Fixture mode (no API). From your notes: this is the frozen demo trip; start `pnpm dev:api` to talk to your journal.';
  for (const w of text.split(/(\s+)/)) {
    onEvent({ type: 'delta', text: w });
    await new Promise((r) => setTimeout(r, 20));
  }
  onEvent({ type: 'done', message_id: 'fixture', content: text });
}
export function readOnly(): never {
  throw new ApiClientError(
    400,
    'fixture',
    'Fixture mode is read-only — start the API (pnpm dev:api) and drop ?fixture=1',
  );
}

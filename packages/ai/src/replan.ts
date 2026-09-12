import {
  ReplanDraft,
  dateForDay,
  naive,
  type BBox,
  type LatLng,
  type NewPin,
  type Ports,
  type ReplanDiff,
  type ReplanRequest,
  type ReplanResponse,
  type Trip,
} from '@pinlog/schema';
import { describeTrip } from './context';
import { resolveStop } from './planner';

export const REPLAN_SYSTEM = `You edit an existing itinerary of pins. Return a DIFF, never a rewrite.
- Change only what the instruction asks for; leave everything else untouched.
- Pins marked LOCKED were created by the traveler: never remove or change them (you may add around them).
- To add a stop, give a real place with a geocodable search_query (official name + city) and a day_index.
- To move a stop in time, use changed[].patch with planned_start/planned_end as YYYY-MM-DDTHH:mm:ss on the pin's date.
- summary: one sentence the traveler will read.`;

export function replanPrompt(
  trip: Trip,
  pins: Awaited<ReturnType<Ports['repo']['pins']['listByTrip']>>,
  instruction: string,
): string {
  const lines = pins.map(
    (p) =>
      `- ${p.id} · day ${p.day_index} #${p.order_index} · ${p.name} (${p.kind}) · ${p.planned_start ?? '?'} → ${p.planned_end ?? '?'}${p.source === 'user' ? ' · LOCKED' : ''}`,
  );
  return [
    describeTrip(trip),
    'Current pins:',
    ...lines,
    '',
    `Instruction: ${instruction}`,
    'Return the replan diff.',
  ].join('\n');
}

/** Owner C. Natural-language edit → resolved ReplanDiff → applied atomically (locked user pins → LockedPinError). */
export async function replan(
  ports: Pick<Ports, 'repo' | 'llm' | 'places'>,
  trip: Trip,
  req: ReplanRequest,
): Promise<ReplanResponse> {
  const pins = await ports.repo.pins.listByTrip(trip.id);
  const draft = await ports.llm.completeJSON({
    task: 'replan',
    schema: ReplanDraft,
    schema_name: 'replan_draft',
    system: REPLAN_SYSTEM,
    messages: [{ role: 'user', content: replanPrompt(trip, pins, req.instruction) }],
    inputs: {
      instruction: req.instruction,
      pins: pins.map((p) => ({ id: p.id, name: p.name, day_index: p.day_index, source: p.source })),
    },
    effort: 'low',
    max_tokens: 4096,
  });

  let geo: { center: LatLng | null; bbox: BBox | null } = {
    center:
      trip.center_lat !== null && trip.center_lng !== null
        ? { lat: trip.center_lat, lng: trip.center_lng }
        : null,
    bbox: null,
  };
  if (draft.added.length) {
    try {
      const g = await ports.places.geocode(trip.destination);
      if (g) geo = { center: { lat: g.lat, lng: g.lng }, bbox: g.bbox };
    } catch {
      /* unbounded */
    }
  }
  const added: ReplanDiff['added'] = [];
  const unresolved: string[] = [];
  for (const a of draft.added) {
    const hit = await resolveStop(ports.places, a, geo);
    if (!hit) {
      unresolved.push(a.name);
      continue;
    }
    const date = dateForDay(trip.start_date, a.day_index);
    const pin: Omit<NewPin, 'trip_id'> = {
      name: a.name,
      place_id: hit.place_id,
      address: hit.address,
      lat: hit.lat,
      lng: hit.lng,
      day_index: a.day_index,
      order_index: 0, // appended after the day's existing pins below
      planned_start: naive(date, a.start_time),
      planned_end: naive(date, a.end_time <= a.start_time ? a.start_time : a.end_time),
      kind: a.kind,
      source: 'ai',
      ai_reason: a.reason,
    };
    added.push(pin);
  }
  // order_index: append after the existing pins of that day (applyDiff also accepts undefined, but NewPin requires a number)
  const counts = new Map<number, number>();
  for (const p of pins) counts.set(p.day_index, (counts.get(p.day_index) ?? 0) + 1);
  for (const a of added) {
    const n = counts.get(a.day_index) ?? 0;
    a.order_index = n;
    counts.set(a.day_index, n + 1);
  }

  const diff: ReplanDiff = {
    summary: unresolved.length
      ? `${draft.summary} (could not verify: ${unresolved.join(', ')})`
      : draft.summary,
    added,
    changed: draft.changed,
    removed: draft.removed,
  };
  const after = await ports.repo.pins.applyDiff(trip.id, diff);
  return { diff, pins: after };
}

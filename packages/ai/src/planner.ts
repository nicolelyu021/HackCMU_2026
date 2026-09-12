import {
  ItineraryDraft,
  dateForDay,
  itineraryToNewPins,
  naive,
  tripLengthDays,
  type BBox,
  type Itinerary,
  type ItineraryDraftStop,
  type ItineraryStop,
  type LatLng,
  type PlanEvent,
  type PlanRequest,
  type Ports,
  type Trip,
} from '@pinlog/schema';
import { describeTrip } from './context';

export const PLANNER_SYSTEM = `You are Pinlog's trip planner. You turn a traveler's preferences into a day-by-day itinerary of PINS: real places on a map.

Rules:
- Only real, well-known places that exist on OpenStreetMap: sights, museums, parks, viewpoints, markets, restaurants, cafés. Never invent a place, never describe a generic activity ("walk around downtown").
- For every stop give a search_query a geocoder will resolve: the official place name plus the city (e.g. "Fushimi Inari Taisha, Kyoto"). No adjectives in search_query.
- 4 to 6 stops per day, in chronological order, realistic HH:mm times (opening hours vary; keep museums 10:00–17:00, viewpoints near sunset), at most 2 meals per day, stops of one day clustered geographically so walking/transit is short.
- Match the traveler's interests, pace and budget. relaxed = 4 stops, moderate = 5, packed = 6. Include the must-see list if given.
- kind ∈ poi | food | lodging | transport | custom (use poi for sights, food for meals/cafés).
- reason: one sentence, first-person-friendly, with ONE concrete detail (what to see/eat/do there), no marketing tone.
- theme: 3–6 words per day.`;

export function planPrompt(trip: Trip, req: PlanRequest, days: number): string {
  return [
    describeTrip(trip),
    `Plan exactly ${days} day${days > 1 ? 's' : ''} (day_index 1..${days}; day 1 is ${trip.start_date}).`,
    req.must_see?.length ? `Must-see: ${req.must_see.join('; ')}` : null,
    req.notes ? `Traveler's notes for the planner: ${req.notes}` : null,
    'Return the itinerary draft.',
  ]
    .filter(Boolean)
    .join('\n');
}

const inBBox = (p: { lat: number; lng: number }, b: BBox) =>
  p.lng >= b[0] && p.lat >= b[1] && p.lng <= b[2] && p.lat <= b[3];

/** Resolve one drafted stop against the places port. Empty = unresolved (no pin without a place_id). */
export async function resolveStop(
  places: Ports['places'],
  stop: ItineraryDraftStop,
  geo: { center: LatLng | null; bbox: BBox | null },
): Promise<{
  place_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
} | null> {
  const opts = { bbox: geo.bbox ?? undefined, near: geo.center ?? undefined, limit: 3 };
  const queries = [stop.search_query, stop.name].filter((q, i, a) => q && a.indexOf(q) === i);
  for (const q of queries) {
    let hits: Awaited<ReturnType<Ports['places']['search']>> = [];
    try {
      hits = await places.search(q, opts);
    } catch {
      hits = [];
    }
    const ok = geo.bbox ? hits.filter((h) => inBBox(h, geo.bbox!)) : hits;
    if (ok[0]) {
      const h = ok[0];
      return {
        place_id: h.place_id,
        name: h.name || stop.name,
        address: h.address,
        lat: h.lat,
        lng: h.lng,
      };
    }
  }
  return null;
}

/**
 * Owner C. Streams the itinerary as it is drafted and verified; persists pins in one transaction before `done`.
 * Existing AI pins of the trip are replaced; user/photo pins are kept.
 */
export async function* plan(
  ports: Pick<Ports, 'repo' | 'llm' | 'places'>,
  trip: Trip,
  req: PlanRequest,
  signal?: AbortSignal,
): AsyncIterable<PlanEvent> {
  const days = Math.max(1, tripLengthDays(trip.start_date, trip.end_date));
  try {
    yield {
      type: 'status',
      stage: 'drafting',
      detail: `${trip.destination} · ${days} day${days > 1 ? 's' : ''}`,
    };
    const draft = await ports.llm.completeJSON({
      task: 'plan',
      schema: ItineraryDraft,
      schema_name: 'itinerary_draft',
      system: PLANNER_SYSTEM,
      messages: [{ role: 'user', content: planPrompt(trip, req, days) }],
      inputs: {
        destination: trip.destination,
        days,
        must_see: req.must_see ?? [],
        notes: req.notes ?? '',
      },
      effort: 'low',
      max_tokens: 8192,
    });
    if (signal?.aborted) return;

    let geo: { center: LatLng | null; bbox: BBox | null } = { center: null, bbox: null };
    try {
      const g = await ports.places.geocode(trip.destination);
      if (g) geo = { center: { lat: g.lat, lng: g.lng }, bbox: g.bbox };
    } catch {
      /* no bbox: resolve unbounded */
    }
    yield {
      type: 'status',
      stage: 'resolving',
      detail: geo.bbox
        ? 'checking every stop against OpenStreetMap'
        : 'geocoder unavailable for the destination',
    };

    const dropped: string[] = [];
    const itinerary: Itinerary = {
      destination: trip.destination,
      center: geo.center ?? { lat: 0, lng: 0 },
      days: [],
    };
    const seen = new Set<string>();
    for (const day of [...draft.days].sort((a, b) => a.day_index - b.day_index)) {
      if (day.day_index < 1 || day.day_index > days) {
        for (const s of day.stops) {
          dropped.push(s.name);
          yield {
            type: 'warning',
            name: s.name,
            reason: `day ${day.day_index} is outside the trip`,
          };
        }
        continue;
      }
      const date = dateForDay(trip.start_date, day.day_index);
      const stops: ItineraryStop[] = [];
      for (const s of day.stops) {
        if (signal?.aborted) return;
        const hit = await resolveStop(ports.places, s, geo);
        if (!hit || seen.has(hit.place_id)) {
          dropped.push(s.name);
          yield {
            type: 'warning',
            name: s.name,
            reason: hit
              ? 'duplicate of an earlier stop'
              : `no OpenStreetMap match inside ${trip.destination}`,
          };
          continue;
        }
        seen.add(hit.place_id);
        const stop: ItineraryStop = {
          name: s.name,
          place_id: hit.place_id,
          address: hit.address,
          lat: hit.lat,
          lng: hit.lng,
          kind: s.kind,
          planned_start: naive(date, s.start_time),
          planned_end: naive(date, s.end_time <= s.start_time ? s.start_time : s.end_time),
          ai_reason: s.reason,
        };
        stops.push(stop);
        yield { type: 'stop', day_index: day.day_index, stop };
      }
      itinerary.days.push({ day_index: day.day_index, date, stops });
    }

    yield { type: 'status', stage: 'ordering' };
    for (const d of itinerary.days)
      d.stops.sort((a, b) => a.planned_start.localeCompare(b.planned_start));
    if (!geo.center) {
      const all = itinerary.days.flatMap((d) => d.stops);
      if (all.length) {
        itinerary.center = {
          lat: all.reduce((s, x) => s + x.lat, 0) / all.length,
          lng: all.reduce((s, x) => s + x.lng, 0) / all.length,
        };
      }
    }

    yield { type: 'status', stage: 'saving' };
    const existing = await ports.repo.pins.listByTrip(trip.id);
    for (const p of existing) if (p.source === 'ai') await ports.repo.pins.delete(p.id);
    await ports.repo.pins.createMany(itineraryToNewPins(trip.id, itinerary));
    await ports.repo.trips.update(trip.id, {
      center_lat: itinerary.center.lat,
      center_lng: itinerary.center.lng,
    });
    const pins = await ports.repo.pins.listByTrip(trip.id);
    yield { type: 'done', itinerary, pins, dropped };
  } catch (err) {
    yield { type: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}

import { z } from 'zod';
import { Id, IsoDate, LatLng, Latitude, Longitude, NaiveDateTime } from './common';
import { NewPin, PinKind, UpdatePinInput } from './pin';

const Clock = z.string().regex(/^\d{2}:\d{2}$/, 'expected HH:mm');

/** Raw planner LLM output, BEFORE places verification. Names are hints; search_query is what we geocode. */
export const ItineraryDraftStop = z.object({
  name: z.string().min(1),
  search_query: z.string().min(1),
  kind: PinKind,
  start_time: Clock,
  end_time: Clock,
  reason: z.string(),
});
export type ItineraryDraftStop = z.infer<typeof ItineraryDraftStop>;

export const ItineraryDraft = z.object({
  days: z
    .array(
      z.object({
        day_index: z.number().int().min(1),
        theme: z.string().optional(),
        stops: z.array(ItineraryDraftStop).min(1),
      }),
    )
    .min(1),
});
export type ItineraryDraft = z.infer<typeof ItineraryDraft>;

/** Verified stop: every one resolved to a real place (rule: no pin without a place_id). */
export const ItineraryStop = z.object({
  name: z.string().min(1),
  place_id: z.string().min(1),
  address: z.string().nullable(),
  lat: Latitude,
  lng: Longitude,
  kind: PinKind,
  planned_start: NaiveDateTime,
  planned_end: NaiveDateTime,
  ai_reason: z.string(),
});
export type ItineraryStop = z.infer<typeof ItineraryStop>;

export const Itinerary = z.object({
  destination: z.string(),
  center: LatLng,
  days: z.array(
    z.object({ day_index: z.number().int().min(1), date: IsoDate, stops: z.array(ItineraryStop) }),
  ),
});
export type Itinerary = z.infer<typeof Itinerary>;

/** Pure: resolved itinerary → pin rows to insert (order_index = position in the day, source 'ai'). */
export function itineraryToNewPins(trip_id: string, itinerary: Itinerary): NewPin[] {
  const pins: NewPin[] = [];
  for (const day of itinerary.days) {
    day.stops.forEach((s, i) => {
      pins.push({
        trip_id,
        name: s.name,
        place_id: s.place_id,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        day_index: day.day_index,
        order_index: i,
        planned_start: s.planned_start,
        planned_end: s.planned_end,
        kind: s.kind,
        source: 'ai',
        ai_reason: s.ai_reason,
      });
    });
  }
  return pins;
}

/** Replan LLM output: a diff, never a rewrite. */
export const ReplanDraft = z.object({
  summary: z.string(),
  added: z.array(ItineraryDraftStop.extend({ day_index: z.number().int().min(1) })),
  changed: z.array(z.object({ pin_id: Id, patch: UpdatePinInput, reason: z.string().optional() })),
  removed: z.array(z.object({ pin_id: Id, reason: z.string().optional() })),
});
export type ReplanDraft = z.infer<typeof ReplanDraft>;

/** After places resolution: what the API applies and returns. Server rule: pins with source 'user' are locked (400 locked_pin). */
export const ReplanDiff = ReplanDraft.extend({
  added: z.array(NewPin.omit({ trip_id: true })),
});
export type ReplanDiff = z.infer<typeof ReplanDiff>;

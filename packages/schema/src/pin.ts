import { z } from 'zod';
import { Id, Latitude, Longitude, NaiveDateTime, Timestamp } from './common';

export const PinKind = z.enum(['poi', 'food', 'lodging', 'transport', 'custom']);
export type PinKind = z.infer<typeof PinKind>;
/** ai = planner, user = manual, photo = "create pin from this photo". User pins are locked against replan. */
export const PinSource = z.enum(['ai', 'user', 'photo']);
export type PinSource = z.infer<typeof PinSource>;

export const Pin = z.object({
  id: Id,
  trip_id: Id,
  name: z.string().min(1),
  /** Verified place reference, e.g. 'osm:way/30678664'. Rule: AI pins must have one (enforced by the planner). */
  place_id: z.string().nullable(),
  address: z.string().nullable(),
  lat: Latitude,
  lng: Longitude,
  /** 1-based day of the trip. */
  day_index: z.number().int().min(1),
  /** Position within the day, 0-based. */
  order_index: z.number().int().min(0),
  planned_start: NaiveDateTime.nullable(),
  planned_end: NaiveDateTime.nullable(),
  kind: PinKind,
  source: PinSource,
  /** Why the planner picked it; shown in the pin sheet. */
  ai_reason: z.string().nullable(),
  created_at: Timestamp,
});
export type Pin = z.infer<typeof Pin>;

export const NewPin = Pin.omit({ id: true, created_at: true });
export type NewPin = z.infer<typeof NewPin>;

/** POST /trips/:id/pins body (manual pin or pin-from-photo). */
export const CreatePinInput = z.object({
  name: z.string().min(1),
  lat: Latitude,
  lng: Longitude,
  day_index: z.number().int().min(1),
  /** Omit to append at the end of the day. */
  order_index: z.number().int().min(0).optional(),
  place_id: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  planned_start: NaiveDateTime.nullable().default(null),
  planned_end: NaiveDateTime.nullable().default(null),
  kind: PinKind.default('custom'),
  source: PinSource.default('user'),
  ai_reason: z.string().nullable().default(null),
});
export type CreatePinInput = z.infer<typeof CreatePinInput>;

export const UpdatePinInput = Pin.pick({
  name: true,
  address: true,
  lat: true,
  lng: true,
  day_index: true,
  order_index: true,
  planned_start: true,
  planned_end: true,
  kind: true,
}).partial();
export type UpdatePinInput = z.infer<typeof UpdatePinInput>;

export const ReorderPinsInput = z.object({
  order: z.array(
    z.object({ pin_id: Id, day_index: z.number().int().min(1), order_index: z.number().int().min(0) }),
  ),
});
export type ReorderPinsInput = z.infer<typeof ReorderPinsInput>;

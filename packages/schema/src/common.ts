import { z } from 'zod';

/** Ids are opaque strings: crypto.randomUUID() at runtime, readable stable ids in fixtures (trip_pgh, pin_pgh_d1_phipps). */
export const Id = z.string().min(1);
export type Id = z.infer<typeof Id>;

export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
export type IsoDate = z.infer<typeof IsoDate>;

/**
 * Trip-local wall-clock time with NO offset: YYYY-MM-DDTHH:mm:ss.
 * EXIF DateTimeOriginal has no timezone, so planned windows and photo times are compared as naive wall clocks.
 */
export const NaiveDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, 'expected YYYY-MM-DDTHH:mm:ss (trip-local, no offset)');
export type NaiveDateTime = z.infer<typeof NaiveDateTime>;

/** Server-side UTC instant (created_at, updated_at). */
export const Timestamp = z.iso.datetime();
export type Timestamp = z.infer<typeof Timestamp>;

export const Language = z.enum(['en', 'zh']);
export type Language = z.infer<typeof Language>;

export const Latitude = z.number().min(-90).max(90);
export const Longitude = z.number().min(-180).max(180);
export const LatLng = z.object({ lat: Latitude, lng: Longitude });
export type LatLng = z.infer<typeof LatLng>;

/** [west, south, east, north] */
export const BBox = z.tuple([Longitude, Latitude, Longitude, Latitude]);
export type BBox = z.infer<typeof BBox>;

/** MapLibre camera; used verbatim by the vlog composition (jumpTo per frame). */
export const Camera = z.object({
  lng: Longitude,
  lat: Latitude,
  zoom: z.number().min(0).max(24),
  pitch: z.number().min(0).max(85),
  bearing: z.number(),
});
export type Camera = z.infer<typeof Camera>;

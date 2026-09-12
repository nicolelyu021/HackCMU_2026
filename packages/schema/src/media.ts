import { z } from 'zod';
import { Id, Latitude, Longitude, NaiveDateTime, Timestamp } from './common';

/** auto = matched by EXIF, manual = user moved it, none = in the unsorted tray. */
export const AssignMethod = z.enum(['auto', 'manual', 'none']);
export type AssignMethod = z.infer<typeof AssignMethod>;

export const MediaExif = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  orientation: z.number().int().optional(),
  /** EXIF OffsetTimeOriginal like '-04:00', kept for later; assignment uses naive wall clocks. */
  offset_time: z.string().optional(),
});
export type MediaExif = z.infer<typeof MediaExif>;

export const Media = z.object({
  id: Id,
  trip_id: Id,
  pin_id: Id.nullable(),
  /** Storage KEYS, not URLs (see storage-keys.ts / fileUrl). */
  storage_path: z.string().min(1),
  thumb_path: z.string().min(1),
  /** Post-orientation pixel size. */
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  mime: z.string().min(1),
  taken_at: NaiveDateTime.nullable(),
  lat: Latitude.nullable(),
  lng: Longitude.nullable(),
  exif: MediaExif.nullable(),
  /** One sentence from the vision model (or fixture); the vlog script may only use facts from captions + notes. */
  caption: z.string().nullable(),
  assign_method: AssignMethod,
  created_at: Timestamp,
});
export type Media = z.infer<typeof Media>;

export const NewMedia = Media.omit({ id: true, created_at: true });
export type NewMedia = z.infer<typeof NewMedia>;

/** Per-file metadata sent alongside a multipart upload (the browser already read EXIF; the server trusts it and only re-parses when missing). */
export const UploadMediaMeta = z.object({
  name: z.string().min(1),
  taken_at: NaiveDateTime.nullable().optional(),
  lat: Latitude.nullable().optional(),
  lng: Longitude.nullable().optional(),
  mime: z.string().optional(),
});
export type UploadMediaMeta = z.infer<typeof UploadMediaMeta>;

/** PATCH /media/:id. pin_id: string → assign_method 'manual'; null → 'none' (back to the tray). */
export const UpdateMediaInput = z.object({
  pin_id: Id.nullable().optional(),
  caption: z.string().nullable().optional(),
});
export type UpdateMediaInput = z.infer<typeof UpdateMediaInput>;

import { z } from 'zod';
import { Id, IsoDate, Language, Latitude, Longitude, Timestamp } from './common';

export const TripStatus = z.enum(['planning', 'active', 'completed']);
export type TripStatus = z.infer<typeof TripStatus>;
export const Pace = z.enum(['relaxed', 'moderate', 'packed']);
export type Pace = z.infer<typeof Pace>;
export const Budget = z.enum(['low', 'mid', 'high']);
export type Budget = z.infer<typeof Budget>;
export const PartyKind = z.enum(['solo', 'couple', 'friends', 'family']);
export const Party = z.object({ size: z.number().int().min(1), kind: PartyKind.optional() });
export type Party = z.infer<typeof Party>;
export const Visibility = z.enum(['private', 'link']);

export const Trip = z.object({
  id: Id,
  title: z.string().min(1),
  destination: z.string().min(1),
  start_date: IsoDate,
  end_date: IsoDate,
  party: Party,
  interests: z.array(z.string()),
  pace: Pace,
  budget: Budget,
  /** Narration / UI language default. */
  language: Language,
  status: TripStatus,
  visibility: Visibility,
  share_slug: z.string().nullable(),
  cover_media_id: Id.nullable(),
  /** Initial map viewport (geocoded destination); null until planned. */
  center_lat: Latitude.nullable(),
  center_lng: Longitude.nullable(),
  created_at: Timestamp,
});
export type Trip = z.infer<typeof Trip>;

/** POST /trips body. Defaults are applied by zod, so the repo receives a complete object. */
export const CreateTripInput = z.object({
  title: z.string().min(1).optional(),
  destination: z.string().min(1),
  start_date: IsoDate,
  end_date: IsoDate,
  party: Party.default({ size: 1 }),
  interests: z.array(z.string()).default([]),
  pace: Pace.default('moderate'),
  budget: Budget.default('mid'),
  language: Language.default('en'),
});
export type CreateTripInput = z.infer<typeof CreateTripInput>;

export const UpdateTripInput = Trip.pick({
  title: true,
  status: true,
  start_date: true,
  end_date: true,
  cover_media_id: true,
  language: true,
  visibility: true,
  center_lat: true,
  center_lng: true,
}).partial();
export type UpdateTripInput = z.infer<typeof UpdateTripInput>;

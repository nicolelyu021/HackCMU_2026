import { z } from 'zod';
import { Id, Language, Timestamp } from './common';
import { MusicMood, VlogScript, Voice } from './script';

/** queued → scripting → tts → done | failed. 'rendering' only for the MP4 export stretch. */
export const VlogStatus = z.enum(['queued', 'scripting', 'tts', 'rendering', 'done', 'failed']);
export type VlogStatus = z.infer<typeof VlogStatus>;

export const VlogSettings = z.object({
  language: Language.default('en'),
  voice: Voice.default('warm_female'),
  music_mood: MusicMood.default('calm'),
  target_length_s: z.number().int().min(30).max(120).default(60),
  /** Free-text regenerate instructions ("more chill", "skip day 1"). */
  instructions: z.string().optional(),
  /** Restrict to these days; omit = whole trip. */
  day_indexes: z.array(z.number().int().min(1)).optional(),
});
export type VlogSettings = z.infer<typeof VlogSettings>;

export const Vlog = z.object({
  id: Id,
  trip_id: Id,
  status: VlogStatus,
  settings: VlogSettings,
  script: VlogScript.nullable(),
  /** Storage key of the rendered MP4 (stretch). */
  video_path: z.string().nullable(),
  duration_s: z.number().nullable(),
  error: z.string().nullable(),
  created_at: Timestamp,
  updated_at: Timestamp,
});
export type Vlog = z.infer<typeof Vlog>;

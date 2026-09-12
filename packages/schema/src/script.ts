import { z } from 'zod';
import { Camera, Id, Language } from './common';

// ---- Vlog script: the C → D contract (PRD 10.6, plus version / subtitle / mood / source_entry_ids) ----

export const Voice = z.enum(['warm_female', 'calm_male', 'bright_female']);
export type Voice = z.infer<typeof Voice>;
export const MusicMood = z.enum(['calm', 'upbeat', 'none']);
export type MusicMood = z.infer<typeof MusicMood>;

export const KenBurns = z.enum(['zoom_in', 'zoom_out', 'pan_left', 'pan_right']);
export type KenBurns = z.infer<typeof KenBurns>;

export const TitleSegment = z.object({
  type: z.literal('title'),
  text: z.string().min(1),
  subtitle: z.string().optional(),
  duration_s: z.number().positive(),
});
export type TitleSegment = z.infer<typeof TitleSegment>;

export const ScriptPhoto = z.object({ media_id: Id, kenburns: KenBurns });
export type ScriptPhoto = z.infer<typeof ScriptPhoto>;

export const PinSegment = z.object({
  type: z.literal('pin'),
  pin_id: Id,
  day_index: z.number().int().min(1),
  camera: Camera,
  photos: z.array(ScriptPhoto).max(4),
  /** ≤ 2 sentences, grounded ONLY in the user's notes and photo captions. */
  narration: z.string(),
  /** Overlay text, e.g. "Phipps Conservatory · 11:42". */
  caption: z.string(),
  mood: z.string().optional(),
  /** Entry ids the narration was grounded in; the UI shows "from your note: …". */
  source_entry_ids: z.array(Id).optional(),
  /** Storage key 'vlogs/<vlog_id>/seg_02.wav'; null until TTS ran. */
  audio_path: z.string().nullable(),
  /** LLM estimate; TTS overwrites with audio duration + SEGMENT_PADDING_S, min MIN_SEGMENT_S. */
  duration_s: z.number().positive(),
});
export type PinSegment = z.infer<typeof PinSegment>;

export const OutroSegment = z.object({
  type: z.literal('outro'),
  /** e.g. "31 km · 9 places · 16 photos" */
  text: z.string(),
  duration_s: z.number().positive(),
});
export type OutroSegment = z.infer<typeof OutroSegment>;

export const ScriptSegment = z.discriminatedUnion('type', [TitleSegment, PinSegment, OutroSegment]);
export type ScriptSegment = z.infer<typeof ScriptSegment>;

export const VlogScript = z.object({
  version: z.literal(1),
  trip: z.object({ title: z.string(), dates: z.string(), language: Language }),
  voice: Voice,
  music_mood: MusicMood,
  segments: z.array(ScriptSegment).min(2),
});
export type VlogScript = z.infer<typeof VlogScript>;

/** Remotion composition constants (D and A both read these). */
export const COMPOSITION = { id: 'Vlog', fps: 30, width: 1080, height: 1920 } as const;
export const SEGMENT_PADDING_S = 0.6;
export const MIN_SEGMENT_S = 3;
export const FLYOVER_S = 1.5;

export function scriptDurationS(script: VlogScript): number {
  return script.segments.reduce((sum, s) => sum + s.duration_s, 0);
}
export function scriptDurationInFrames(script: VlogScript, fps: number = COMPOSITION.fps): number {
  return Math.max(1, Math.round(scriptDurationS(script) * fps));
}
/** Start frame of each segment, in order. */
export function segmentStartFrames(script: VlogScript, fps: number = COMPOSITION.fps): number[] {
  const starts: number[] = [];
  let acc = 0;
  for (const seg of script.segments) {
    starts.push(Math.round(acc * fps));
    acc += seg.duration_s;
  }
  return starts;
}
/** Segment duration derived from a measured narration length. */
export function segmentDurationFromAudio(audio_s: number): number {
  return Math.max(MIN_SEGMENT_S, Math.round((audio_s + SEGMENT_PADDING_S) * 10) / 10);
}

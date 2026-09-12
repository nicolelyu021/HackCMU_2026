import { z } from 'zod';
import {
  FLYOVER_S,
  MusicMood,
  NotFoundError,
  dateForDay,
  routeLengthKm,
  segmentDurationFromAudio,
  type Camera,
  type KenBurns,
  type PinSegment,
  type Ports,
  type ScriptSegment,
  type TripBundle,
  type VlogScript,
  type VlogSettings,
} from '@pinlog/schema';
import { describeTrip } from './context';
import { clockOf, estimateSpeechSeconds, firstSentences, wordCount } from './util';

// ---- What the LLM sees and returns (narration only); the deterministic assembler turns it into a VlogScript ----

export interface TimelinePin {
  pin_id: string;
  name: string;
  day_index: number;
  date: string;
  planned_start: string | null;
  planned_end: string | null;
  kind: string;
  ai_reason: string | null;
  lat: number;
  lng: number;
  notes: { id: string; text: string; mood: string | null }[];
  photos: { id: string; taken_at: string | null; caption: string | null }[];
}

export const ScriptDraftSegment = z.object({
  pin_id: z.string().describe('pin id from the timeline'),
  narration: z
    .string()
    .describe('≤ 2 sentences, first person, only facts from the notes and captions of this pin'),
  caption: z.string().describe('overlay text, e.g. "Phipps Conservatory · 11:42"'),
  mood: z.string().optional(),
  photo_ids: z.array(z.string()).describe('≤ 4 photo ids of this pin, in display order'),
  source_entry_ids: z
    .array(z.string())
    .describe('note ids the narration used (empty if only captions)'),
});
export type ScriptDraftSegment = z.infer<typeof ScriptDraftSegment>;

export const ScriptDraft = z.object({
  title: z.string().describe('vlog title, ≤ 5 words'),
  subtitle: z.string().optional().describe('e.g. "two days · four pins"'),
  music_mood: MusicMood.optional(),
  segments: z.array(ScriptDraftSegment),
});
export type ScriptDraft = z.infer<typeof ScriptDraft>;

/** Pins worth a segment: those with a photo or a note (all pins when the trip has neither yet). */
export function buildTimeline(bundle: TripBundle, day_indexes?: number[]): TimelinePin[] {
  const pins = [...bundle.pins]
    .filter((p) => !day_indexes || day_indexes.includes(p.day_index))
    .sort((a, b) => a.day_index - b.day_index || a.order_index - b.order_index);
  const items = pins.map<TimelinePin>((p) => ({
    pin_id: p.id,
    name: p.name,
    day_index: p.day_index,
    date: dateForDay(bundle.trip.start_date, p.day_index),
    planned_start: p.planned_start,
    planned_end: p.planned_end,
    kind: p.kind,
    ai_reason: p.ai_reason,
    lat: p.lat,
    lng: p.lng,
    notes: bundle.entries
      .filter((e) => e.pin_id === p.id)
      .map((e) => ({ id: e.id, text: e.text, mood: e.mood })),
    photos: bundle.media
      .filter((m) => m.pin_id === p.id)
      .sort((a, b) => (a.taken_at ?? '9999').localeCompare(b.taken_at ?? '9999'))
      .map((m) => ({ id: m.id, taken_at: m.taken_at, caption: m.caption })),
  }));
  const rich = items.filter((i) => i.notes.length || i.photos.length);
  return rich.length ? rich : items;
}

export function wordBudget(
  target_length_s: number,
  segments: number,
): { total: number; per_segment: number } {
  const speaking = Math.max(20, target_length_s - 3 - 4 - segments * FLYOVER_S);
  const total = Math.round(speaking * 2.6);
  return {
    total,
    per_segment: Math.max(12, Math.min(40, Math.floor(total / Math.max(1, segments)))),
  };
}

export const SCRIPT_SYSTEM = `You write the narration for a 45–90 second vertical travel vlog built from a traveler's pins, photos and notes.
Hard rules:
- One segment per pin in the timeline, in order. Skip a pin only if it has neither notes nor photos.
- narration: at most 2 sentences, first person (plural "we" if the party is more than one), warm and specific. Use ONLY facts that appear in that pin's notes or photo captions. Never invent weather, prices, feelings or events. Prefer the traveler's own words.
- source_entry_ids: list the note ids you drew from (empty array if only captions were used).
- photo_ids: pick at most 4 of that pin's photo ids, most telling first.
- caption: "<place> · <HH:MM of the first chosen photo>" (or just the place).
- Keep the total narration within the word budget you are given.
- title: ≤ 5 words; subtitle: like "two days · four pins".`;

export function scriptPrompt(
  bundle: TripBundle,
  timeline: TimelinePin[],
  settings: VlogSettings,
  previous: VlogScript | null | undefined,
): string {
  const budget = wordBudget(settings.target_length_s, timeline.length);
  const lines: string[] = [
    describeTrip(bundle.trip),
    '',
    `Word budget: about ${budget.total} words total, ~${budget.per_segment} per segment.`,
  ];
  if (settings.instructions)
    lines.push(`Traveler's instructions for this version: ${settings.instructions}`);
  if (previous) {
    lines.push('Previous narration (rewrite it following the instructions; keep what still fits):');
    for (const s of previous.segments)
      if (s.type === 'pin') lines.push(`  ${s.pin_id}: ${s.narration}`);
  }
  lines.push('', 'Timeline:');
  for (const t of timeline) {
    lines.push(
      `Pin ${t.pin_id} · day ${t.day_index} (${t.date}) · ${t.name} (${t.kind}) · ${clockOf(t.planned_start) ?? '?'}–${clockOf(t.planned_end) ?? '?'}`,
    );
    if (t.ai_reason) lines.push(`  planner's reason (NOT a fact about the visit): ${t.ai_reason}`);
    for (const n of t.notes)
      lines.push(`  note ${n.id}${n.mood ? ` (mood ${n.mood})` : ''}: "${n.text}"`);
    for (const p of t.photos)
      lines.push(
        `  photo ${p.id}${p.taken_at ? ` at ${clockOf(p.taken_at)}` : ''}: ${p.caption ?? '(no caption)'}`,
      );
  }
  lines.push('', 'Return the script draft.');
  return lines.join('\n');
}

/** Deterministic mock: narration = the pin's first note (≤ 2 sentences), else the first caption. Grounded by construction. */
export function mockScriptDraft(
  timeline: TimelinePin[],
  inputs: Record<string, unknown> = {},
): ScriptDraft {
  const title = typeof inputs.title === 'string' ? inputs.title : 'Our trip';
  const days = new Set(timeline.map((t) => t.day_index)).size;
  return {
    title,
    subtitle: `${days === 1 ? 'one day' : `${days} days`} · ${timeline.length} pins`,
    music_mood: 'calm',
    segments: timeline
      .filter((t) => t.notes.length || t.photos.length)
      .map((t) => {
        const note = t.notes[0];
        const cap = t.photos.find((p) => p.caption)?.caption;
        const narration = note
          ? firstSentences(note.text, 2)
          : cap
            ? `${t.name}: ${cap.charAt(0).toLowerCase()}${cap.slice(1)}`
            : `${t.name}.`;
        const first = t.photos[0];
        return {
          pin_id: t.pin_id,
          narration,
          caption: `${t.name}${first?.taken_at ? ` · ${clockOf(first.taken_at)}` : ''}`,
          mood: note?.mood ?? undefined,
          photo_ids: t.photos.slice(0, 3).map((p) => p.id),
          source_entry_ids: note ? [note.id] : [],
        };
      }),
  };
}

const KENBURNS: KenBurns[] = ['zoom_in', 'pan_left', 'zoom_out', 'pan_right'];

export function cameraFor(pin: { lat: number; lng: number }, i: number): Camera {
  return {
    lng: pin.lng,
    lat: pin.lat,
    zoom: 15 + (i % 3) * 0.5,
    pitch: 50 + (i % 2) * 10,
    bearing: ((i * 47) % 360) - 180,
  };
}

/** Pure: LLM draft + timeline → VlogScript. Enforces every invariant the draft could break. */
export function assembleScript(
  bundle: TripBundle,
  timeline: TimelinePin[],
  draft: ScriptDraft,
  settings: VlogSettings,
): VlogScript {
  const byId = new Map(timeline.map((t) => [t.pin_id, t]));
  const segments: ScriptSegment[] = [];
  const dates = `${bundle.trip.start_date} – ${bundle.trip.end_date}`;
  segments.push({
    type: 'title',
    text: draft.title.trim() || bundle.trip.title,
    subtitle: draft.subtitle,
    duration_s: 3,
  });
  let k = 0;
  const used = new Set<string>();
  for (const seg of draft.segments) {
    const t = byId.get(seg.pin_id);
    if (!t || used.has(seg.pin_id)) continue;
    used.add(seg.pin_id);
    const photoIds = new Set(t.photos.map((p) => p.id));
    let chosen = seg.photo_ids
      .filter((id, i, a) => photoIds.has(id) && a.indexOf(id) === i)
      .slice(0, 4);
    if (chosen.length === 0) chosen = t.photos.slice(0, 4).map((p) => p.id);
    const noteIds = new Set(t.notes.map((n) => n.id));
    const narration = firstSentences(seg.narration.trim(), 2);
    const pinSeg: PinSegment = {
      type: 'pin',
      pin_id: t.pin_id,
      day_index: t.day_index,
      camera: cameraFor(t, k),
      photos: chosen.map((id) => ({ media_id: id, kenburns: KENBURNS[k++ % KENBURNS.length]! })),
      narration,
      caption: seg.caption.trim() || t.name,
      mood: seg.mood,
      source_entry_ids: seg.source_entry_ids.filter((id) => noteIds.has(id)),
      audio_path: null,
      duration_s: segmentDurationFromAudio(estimateSpeechSeconds(narration)),
    };
    segments.push(pinSeg);
  }
  const pins = bundle.pins
    .filter((p) => !settings.day_indexes || settings.day_indexes.includes(p.day_index))
    .sort((a, b) => a.day_index - b.day_index || a.order_index - b.order_index);
  const photoCount = bundle.media.filter(
    (m) => m.pin_id && pins.some((p) => p.id === m.pin_id),
  ).length;
  segments.push({
    type: 'outro',
    text: `${routeLengthKm(pins)} km · ${pins.length} places · ${photoCount} photos`,
    duration_s: 4,
  });
  return {
    version: 1,
    trip: { title: bundle.trip.title, dates, language: settings.language },
    voice: settings.voice,
    music_mood: draft.music_mood ?? settings.music_mood,
    segments,
  };
}

/** Owner C. Script = LLM narration (grounded in notes + captions) + deterministic assembly (cameras, Ken Burns, timing). */
export async function generateScript(
  ports: Pick<Ports, 'repo' | 'llm'>,
  trip_id: string,
  settings: VlogSettings,
  opts: { previous?: VlogScript | null } = {},
): Promise<VlogScript> {
  const bundle = await ports.repo.trips.bundle(trip_id);
  if (!bundle) throw new NotFoundError('trip', trip_id);
  const timeline = buildTimeline(bundle, settings.day_indexes);
  if (timeline.length === 0) throw new Error('This trip has no pins to make a vlog from');
  const draft = await ports.llm.completeJSON({
    task: 'script',
    schema: ScriptDraft,
    schema_name: 'script_draft',
    system: SCRIPT_SYSTEM,
    messages: [{ role: 'user', content: scriptPrompt(bundle, timeline, settings, opts.previous) }],
    inputs: {
      title: bundle.trip.title,
      timeline,
      target_length_s: settings.target_length_s,
      instructions: settings.instructions ?? '',
      previous: opts.previous
        ? opts.previous.segments.filter((s) => s.type === 'pin').map((s) => s.narration)
        : null,
    },
    effort: 'medium',
    max_tokens: 6000,
  });
  const script = assembleScript(bundle, timeline, draft, settings);
  const words = script.segments.reduce(
    (n, s) => (s.type === 'pin' ? n + wordCount(s.narration) : n),
    0,
  );
  if (words === 0) throw new Error('The script has no narration');
  return script;
}

import {
  clockOf,
  dateForDay,
  dayIndexOf,
  nowNaive,
  tripLengthDays,
  type Entry,
  type Media,
  type Message,
  type Pin,
  type Trip,
  type TripBundle,
} from '@pinlog/schema';

// Pure text builders: everything the model is allowed to know. Ask/chat/summary/script are grounded ONLY in this.

const range = (p: Pin) =>
  p.planned_start && p.planned_end
    ? `${clockOf(p.planned_start)}–${clockOf(p.planned_end)}`
    : 'no time set';

export function describeTrip(trip: Trip): string {
  const party = trip.party.kind ? `${trip.party.size} (${trip.party.kind})` : `${trip.party.size}`;
  return [
    `Trip: ${trip.title} — ${trip.destination} · ${trip.start_date} → ${trip.end_date} (${tripLengthDays(trip.start_date, trip.end_date)} days)`,
    `Party: ${party} · interests: ${trip.interests.join(', ') || 'none given'} · pace ${trip.pace} · budget ${trip.budget} · language ${trip.language}`,
  ].join('\n');
}

/** 1-based day of `now` inside the trip, or null when now is outside the trip dates. */
export function dayIndexForNow(trip: Trip, now: string = nowNaive()): number | null {
  const d = dayIndexOf(trip.start_date, now);
  const len = tripLengthDays(trip.start_date, trip.end_date);
  return d >= 1 && d <= len ? d : null;
}

export function describeNow(trip: Trip, now: string): string {
  const d = dayIndexForNow(trip, now);
  return `Now: ${now.replace('T', ' ')} (${d ? `day ${d} of the trip` : 'outside the trip dates'})`;
}

function describeEntries(entries: Entry[], indent = ''): string {
  if (entries.length === 0) return `${indent}(no notes yet)`;
  return entries
    .map((e) => `${indent}- note ${e.id}${e.mood ? ` (mood: ${e.mood})` : ''}: "${e.text}"`)
    .join('\n');
}

function describeMedia(media: Media[], indent = ''): string {
  const captioned = media.filter((m) => m.caption);
  if (media.length === 0) return `${indent}(no photos yet)`;
  const lines = captioned.map(
    (m) =>
      `${indent}- photo ${m.id}${m.taken_at ? ` at ${clockOf(m.taken_at)}` : ''}: ${m.caption}`,
  );
  const rest = media.length - captioned.length;
  if (rest > 0) lines.push(`${indent}- ${rest} more photo${rest > 1 ? 's' : ''} without a caption`);
  return lines.join('\n');
}

export interface PinContextInput {
  trip: Trip;
  pin: Pin;
  pins: Pin[];
  entries: Entry[];
  media: Media[];
  now: string;
}

/** Context bundle for pin-level Ask (PRD 10.5, minus tools). */
export function describePinContext(i: PinContextInput): string {
  const ordered = [...i.pins].sort(
    (a, b) => a.day_index - b.day_index || a.order_index - b.order_index,
  );
  const idx = ordered.findIndex((p) => p.id === i.pin.id);
  const prev = idx > 0 ? ordered[idx - 1] : undefined;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : undefined;
  return [
    describeTrip(i.trip),
    describeNow(i.trip, i.now),
    '',
    `This pin: ${i.pin.name} (${i.pin.kind}) · day ${i.pin.day_index} (${dateForDay(i.trip.start_date, i.pin.day_index)}) · planned ${range(i.pin)}`,
    i.pin.address ? `Address: ${i.pin.address}` : null,
    i.pin.ai_reason
      ? `Why the planner picked it: ${i.pin.ai_reason}`
      : `Added by the traveler (${i.pin.source} pin)`,
    i.pin.place_id ? `Verified place: ${i.pin.place_id}` : 'Not verified against a places database',
    prev ? `Previous pin: ${prev.name} (${range(prev)})` : 'Previous pin: none (first stop)',
    next ? `Next pin: ${next.name} (${range(next)})` : 'Next pin: none (last stop)',
    '',
    "Traveler's notes on this pin:",
    describeEntries(i.entries),
    '',
    'Photos on this pin (captions describe what is visible):',
    describeMedia(i.media),
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export interface TimelineOptions {
  /** Restrict to one day. */
  day_index?: number;
  now?: string;
  history?: Message[];
}

/** Whole-trip (or one-day) timeline for the journal chat, summaries and the vlog script. */
export function describeTimeline(bundle: TripBundle, opts: TimelineOptions = {}): string {
  const { trip } = bundle;
  const days = tripLengthDays(trip.start_date, trip.end_date);
  const lines: string[] = [describeTrip(trip)];
  if (opts.now) lines.push(describeNow(trip, opts.now));
  const pins = [...bundle.pins].sort(
    (a, b) => a.day_index - b.day_index || a.order_index - b.order_index,
  );
  for (let d = 1; d <= Math.max(days, ...pins.map((p) => p.day_index)); d++) {
    if (opts.day_index && d !== opts.day_index) continue;
    const dayPins = pins.filter((p) => p.day_index === d);
    const dayNotes = bundle.entries.filter((e) => e.pin_id === null && e.day_index === d);
    if (dayPins.length === 0 && dayNotes.length === 0 && opts.day_index === undefined) continue;
    lines.push('', `Day ${d} · ${dateForDay(trip.start_date, d)}`);
    for (const p of dayPins) {
      lines.push(
        `  ${range(p)} — ${p.name} (${p.kind}, pin ${p.id})${p.ai_reason ? `: ${p.ai_reason}` : ''}`,
      );
      lines.push(
        describeEntries(
          bundle.entries.filter((e) => e.pin_id === p.id),
          '    ',
        ),
      );
      const photos = bundle.media.filter((m) => m.pin_id === p.id);
      if (photos.length) lines.push(describeMedia(photos, '    '));
    }
    if (dayNotes.length) {
      lines.push('  Day-level notes:');
      lines.push(describeEntries(dayNotes, '    '));
    }
  }
  const tray = bundle.media.filter((m) => !m.pin_id);
  if (tray.length && !opts.day_index)
    lines.push('', `Unsorted photos (no pin yet): ${tray.length}`);
  return lines.join('\n');
}

/** First-person facts only (notes + captions), used by the mock and as `inputs` for replay keys. */
export function collectNotes(bundle: TripBundle, day_index?: number): string[] {
  return bundle.entries
    .filter((e) =>
      day_index
        ? e.day_index === day_index ||
          (e.pin_id && bundle.pins.find((p) => p.id === e.pin_id)?.day_index === day_index)
        : true,
    )
    .map((e) => e.text);
}

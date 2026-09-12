import type { Message, TripBundle } from '@pinlog/schema';
import { tripStats } from './tripStats';

export type ScrapSource = 'you' | 'ai';

export type ScrapItem =
  | {
      kind: 'photo';
      id: string;
      mediaId: string;
      pinName: string;
      thumb: string;
      caption: string;
      source: ScrapSource;
    }
  | {
      kind: 'note';
      id: string;
      text: string;
      pinName: string | null;
      source: 'you';
    }
  | {
      kind: 'chat';
      id: string;
      text: string;
      source: ScrapSource;
    };

export interface ScrapbookModel {
  title: string;
  destination: string;
  start: string;
  end: string;
  km: number;
  pinCount: number;
  photoCount: number;
  noteCount: number;
  chatCount: number;
  route: { lat: number; lng: number; name: string }[];
  items: ScrapItem[];
}

export interface ScrapEdits {
  excluded: string[];
  captions: Record<string, string>;
}

export const emptyEdits = (): ScrapEdits => ({ excluded: [], captions: {} });

export function editsKey(tripId: string) {
  return `pinlog.scrapbook.${tripId}`;
}

export function loadEdits(tripId: string): ScrapEdits {
  if (typeof window === 'undefined') return emptyEdits();
  try {
    const raw = window.localStorage.getItem(editsKey(tripId));
    if (!raw) return emptyEdits();
    const parsed = JSON.parse(raw) as Partial<ScrapEdits>;
    return {
      excluded: Array.isArray(parsed.excluded) ? parsed.excluded : [],
      captions: parsed.captions && typeof parsed.captions === 'object' ? parsed.captions : {},
    };
  } catch {
    return emptyEdits();
  }
}

export function saveEdits(tripId: string, edits: ScrapEdits) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(editsKey(tripId), JSON.stringify(edits));
}

/** Assemble a field-notebook spread from what is already on the trip. No extra model call. */
export function assembleScrapbook(bundle: TripBundle, messages: Message[]): ScrapbookModel {
  const stats = tripStats(bundle);
  const pins = [...bundle.pins].sort(
    (a, b) => a.day_index - b.day_index || a.order_index - b.order_index,
  );
  const pinName = (id: string | null) => pins.find((p) => p.id === id)?.name ?? null;
  const photos: ScrapItem[] = bundle.media
    .filter((m) => m.pin_id)
    .map((m) => ({
      kind: 'photo' as const,
      id: `photo:${m.id}`,
      mediaId: m.id,
      pinName: pinName(m.pin_id) ?? 'a stop',
      thumb: m.thumb_path,
      caption: m.caption ?? '',
      source: m.caption ? ('ai' as const) : ('you' as const),
    }));
  const notes: ScrapItem[] = bundle.entries.map((e) => ({
    kind: 'note' as const,
    id: `note:${e.id}`,
    text: e.text,
    pinName: pinName(e.pin_id),
    source: 'you' as const,
  }));
  const chat: ScrapItem[] = messages.map((m) => ({
    kind: 'chat' as const,
    id: `chat:${m.id}`,
    text: m.content,
    source: m.role === 'assistant' ? ('ai' as const) : ('you' as const),
  }));
  return {
    title: bundle.trip.title,
    destination: bundle.trip.destination,
    start: bundle.trip.start_date,
    end: bundle.trip.end_date,
    km: stats.km,
    pinCount: stats.pins,
    photoCount: stats.photos,
    noteCount: stats.notes,
    chatCount: messages.length,
    route: pins.map((p) => ({ lat: p.lat, lng: p.lng, name: p.name })),
    items: [...photos, ...notes, ...chat],
  };
}

export function applyEdits(model: ScrapbookModel, edits: ScrapEdits): ScrapbookModel {
  return {
    ...model,
    items: model.items
      .filter((it) => !edits.excluded.includes(it.id))
      .map((it) =>
        it.kind === 'photo' && edits.captions[it.id] !== undefined
          ? { ...it, caption: edits.captions[it.id]! }
          : it.kind !== 'photo' && 'text' in it && edits.captions[it.id] !== undefined
            ? { ...it, text: edits.captions[it.id]! }
            : it,
      ),
  };
}

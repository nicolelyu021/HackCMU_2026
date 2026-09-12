import type { Mood, Pin, PinKind } from '@pinlog/schema';

export const clock = (naive: string | null | undefined) => (naive ? naive.slice(11, 16) : '');

export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export const MOOD_EMOJI: Record<Mood, string> = {
  great: '🤩',
  good: '🙂',
  meh: '😐',
  tired: '🥱',
  bad: '😞',
};

export const KIND_LABEL: Record<PinKind, string> = {
  poi: 'Sight',
  food: 'Food',
  lodging: 'Stay',
  transport: 'Transport',
  custom: 'Custom',
};

export const KIND_EMOJI: Record<PinKind, string> = {
  poi: '📍',
  food: '🍴',
  lodging: '🛏️',
  transport: '🚉',
  custom: '⭐',
};

export const DAY_COLORS = [
  '#8b7cb8',
  '#4a4458',
  '#6b6560',
  '#a89fbf',
  '#3f3a36',
  '#9a90b8',
  '#5c564f',
];
export const dayColor = (day: number) => DAY_COLORS[(day - 1) % DAY_COLORS.length]!;

export function windowLabel(p: Pin): string {
  return p.planned_start && p.planned_end
    ? `${clock(p.planned_start)}–${clock(p.planned_end)}`
    : 'no time';
}

export function fmtDistance(m: number | null): string {
  if (m === null) return '';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

export const isVerified = (p: Pin) => !!p.place_id && p.place_id.startsWith('osm:');

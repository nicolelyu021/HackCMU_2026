// Helpers for naive trip-local wall-clock strings (YYYY-MM-DDTHH:mm:ss). No timezone database, no Date-local pitfalls:
// every conversion goes through Date.UTC so the machine timezone never leaks in.

const NAIVE_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isNaiveDateTime(s: string): boolean {
  return NAIVE_RE.test(s);
}

export function naiveToMs(s: string): number {
  const m = NAIVE_RE.exec(s);
  if (!m) throw new Error(`not a naive datetime: ${s}`);
  return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +m[6]!);
}

export function msToNaive(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19);
}

/** EXIF 'YYYY:MM:DD HH:MM:SS' (or ISO-ish) → naive; null for missing / all-zero values. */
export function fromExifDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = /^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(String(raw).trim());
  if (!m || m[1] === '0000') return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
}

export function dateOf(naive: string): string {
  return naive.slice(0, 10);
}
export function clockOf(naive: string): string {
  return naive.slice(11, 16);
}
/** date 'YYYY-MM-DD' + clock 'HH:mm' → naive datetime. */
export function naive(date: string, clock: string): string {
  return `${date}T${clock}:00`;
}
export function addHours(s: string, hours: number): string {
  return msToNaive(naiveToMs(s) + hours * 3_600_000);
}
export function addDays(date: string, days: number): string {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error(`not a date: ${date}`);
  return new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]! + days)).toISOString().slice(0, 10);
}
export function sameDay(a: string, b: string): boolean {
  return dateOf(a) === dateOf(b);
}
export function hoursBetween(a: string, b: string): number {
  return (naiveToMs(b) - naiveToMs(a)) / 3_600_000;
}
/** true if start - pad ≤ t ≤ end + pad (hours). */
export function withinWindow(t: string, start: string, end: string, padHours = 0): boolean {
  const ms = naiveToMs(t);
  const pad = padHours * 3_600_000;
  return ms >= naiveToMs(start) - pad && ms <= naiveToMs(end) + pad;
}
/** 1-based day index of t within a trip starting on start_date (may be < 1 or > length). */
export function dayIndexOf(start_date: string, t: string): number {
  const d0 = naiveToMs(`${start_date}T00:00:00`);
  const d1 = naiveToMs(`${dateOf(t)}T00:00:00`);
  return Math.floor((d1 - d0) / 86_400_000) + 1;
}
export function dateForDay(start_date: string, day_index: number): string {
  return addDays(start_date, day_index - 1);
}
export function tripLengthDays(start_date: string, end_date: string): number {
  return dayIndexOf(start_date, `${end_date}T00:00:00`);
}
/** The machine's local wall clock as a naive string (good enough for "now" in a single-timezone demo). */
export function nowNaive(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

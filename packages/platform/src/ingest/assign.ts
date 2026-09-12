import { dateOf, dayIndexOf, haversineM, withinWindow, type Pin } from '@pinlog/schema';

export const ASSIGN_RADIUS_M = 300;
export const ASSIGN_WINDOW_H = 2;

export interface AssignInput {
  taken_at: string | null;
  lat: number | null;
  lng: number | null;
}
export interface AssignResult {
  pin_id: string | null;
  /** Human-readable explanation for the landing HUD. */
  reason: string;
  distance_m: number | null;
}

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

/** Day of a pin for same-day matching: its planned date, else its day_index relative to the trip start. */
function pinDate(pin: Pin, start_date: string | undefined): string | null {
  if (pin.planned_start) return dateOf(pin.planned_start);
  if (!start_date) return null;
  const d = new Date(`${start_date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + pin.day_index - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Pure. PRD MAP-4: nearest pin within 300 m whose planned window ±2 h contains taken_at;
 * fallback: nearest pin within 300 m on the same day; else unsorted tray. Photos without GPS go to the tray.
 * A GPS match without any timestamp is still assigned (distance is strong evidence and nothing is lost: the tray
 * is one drag away).
 */
export function assignPhoto(
  pins: Pin[],
  photo: AssignInput,
  opts: { radius_m?: number; window_h?: number; start_date?: string } = {},
): AssignResult {
  const radius = opts.radius_m ?? ASSIGN_RADIUS_M;
  const window = opts.window_h ?? ASSIGN_WINDOW_H;
  if (photo.lat === null || photo.lng === null) {
    return { pin_id: null, reason: 'No GPS in the photo → unsorted tray', distance_m: null };
  }
  if (pins.length === 0) {
    return { pin_id: null, reason: 'The trip has no pins yet → unsorted tray', distance_m: null };
  }
  const ranked = pins
    .map((pin) => ({ pin, d: haversineM(photo.lat!, photo.lng!, pin.lat, pin.lng) }))
    .sort((a, b) => a.d - b.d);
  const near = ranked.filter((x) => x.d <= radius);
  const nearest = ranked[0]!;
  if (near.length === 0) {
    return {
      pin_id: null,
      reason: `Nearest pin is ${fmtDist(nearest.d)} away (${nearest.pin.name}) → unsorted tray`,
      distance_m: Math.round(nearest.d),
    };
  }
  if (!photo.taken_at) {
    const best = near[0]!;
    return {
      pin_id: best.pin.id,
      reason: `${fmtDist(best.d)} from ${best.pin.name} · no timestamp, matched by location`,
      distance_m: Math.round(best.d),
    };
  }
  const t = photo.taken_at;
  const inWindow = near.find(
    (x) =>
      x.pin.planned_start &&
      x.pin.planned_end &&
      withinWindow(t, x.pin.planned_start, x.pin.planned_end, window),
  );
  if (inWindow) {
    return {
      pin_id: inWindow.pin.id,
      reason: `${fmtDist(inWindow.d)} from ${inWindow.pin.name} · within window`,
      distance_m: Math.round(inWindow.d),
    };
  }
  const sameDay = near.find((x) => {
    const pd = pinDate(x.pin, opts.start_date);
    if (pd) return pd === dateOf(t);
    return opts.start_date ? dayIndexOf(opts.start_date, t) === x.pin.day_index : false;
  });
  if (sameDay) {
    return {
      pin_id: sameDay.pin.id,
      reason: `${fmtDist(sameDay.d)} from ${sameDay.pin.name} · same day, outside the planned window`,
      distance_m: Math.round(sameDay.d),
    };
  }
  const best = near[0]!;
  return {
    pin_id: null,
    reason: `${fmtDist(best.d)} from ${best.pin.name} but taken on a different day → unsorted tray`,
    distance_m: Math.round(best.d),
  };
}

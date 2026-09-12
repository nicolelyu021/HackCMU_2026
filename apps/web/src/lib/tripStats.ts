import { routeLengthKm, type TripBundle } from '@pinlog/schema';

export function tripStats(bundle: TripBundle) {
  const pins = [...bundle.pins].sort(
    (a, b) => a.day_index - b.day_index || a.order_index - b.order_index,
  );
  return {
    pins: bundle.pins.length,
    photos: bundle.media.length,
    notes: bundle.entries.length,
    km: routeLengthKm(pins),
    unsorted: bundle.media.filter((m) => !m.pin_id).length,
  };
}

/** Project lng/lat into an SVG box. Enough padding that a single pin still sits in the middle. */
export function projectPins(
  pins: { lat: number; lng: number }[],
  w: number,
  h: number,
  pad = 28,
): { x: number; y: number }[] {
  if (pins.length === 0) return [];
  const lngs = pins.map((p) => p.lng);
  const lats = pins.map((p) => p.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const dx = Math.max(maxLng - minLng, 0.012);
  const dy = Math.max(maxLat - minLat, 0.01);
  const padX = (dx - (maxLng - minLng)) / 2;
  const padY = (dy - (maxLat - minLat)) / 2;
  return pins.map((p) => ({
    x: pad + ((p.lng - (minLng - padX)) / dx) * (w - pad * 2),
    y: pad + ((maxLat + padY - p.lat) / dy) * (h - pad * 2),
  }));
}

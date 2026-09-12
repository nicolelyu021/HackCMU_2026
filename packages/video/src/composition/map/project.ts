import type { RenderPin } from '@pinlog/schema';

/** Equirectangular projection of the pins into a box, keeping aspect (lng scaled by cos(lat)). Pure. */
export function projectPins(
  pins: RenderPin[],
  box: { width: number; height: number; padding: number },
): { x: number; y: number; pin: RenderPin }[] {
  if (pins.length === 0) return [];
  const lat0 = pins.reduce((s, p) => s + p.lat, 0) / pins.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const xs = pins.map((p) => p.lng * k);
  const ys = pins.map((p) => -p.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const innerW = box.width - box.padding * 2;
  const innerH = box.height - box.padding * 2;
  const scale = Math.min(innerW / spanX, innerH / spanY);
  const offX = box.padding + (innerW - spanX * scale) / 2;
  const offY = box.padding + (innerH - spanY * scale) / 2;
  return pins.map((pin, i) => ({
    x: offX + (xs[i]! - minX) * scale,
    y: offY + (ys[i]! - minY) * scale,
    pin,
  }));
}

export function polylineLength(points: { x: number; y: number }[]): number {
  let n = 0;
  for (let i = 1; i < points.length; i++)
    n += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
  return n;
}

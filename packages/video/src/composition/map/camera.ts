import { COMPOSITION, type Camera, type RenderPin, type VlogScript } from '@pinlog/schema';
import { flyoverFrames, segmentAtFrame } from '../timing';

// Pure camera math shared by the MapLibre flyover (jumpTo per frame) and the static route card.

export function overviewCamera(pins: RenderPin[]): Camera {
  if (pins.length === 0) return { lng: 0, lat: 0, zoom: 2, pitch: 0, bearing: 0 };
  const lats = pins.map((p) => p.lat);
  const lngs = pins.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const lat = (minLat + maxLat) / 2;
  const lng = (minLng + maxLng) / 2;
  // 9:16 frame: width is the constraint. degrees of lng visible at zoom z ≈ 360 / 2^z * (1080/512)
  const spanLng = Math.max(maxLng - minLng, (maxLat - minLat) * (1080 / 1920), 0.002) * 1.4;
  const zoom = Math.max(9, Math.min(15, Math.log2((360 * (1080 / 512)) / spanLng)));
  return { lng, lat, zoom: Math.round(zoom * 100) / 100, pitch: 35, bearing: -15 };
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function lerpBearing(a: number, b: number, t: number): number {
  let d = ((b - a + 540) % 360) - 180;
  return a + d * t;
}

export function lerpCamera(a: Camera, b: Camera, t: number): Camera {
  const k = Math.max(0, Math.min(1, t));
  // fly "up and over": zoom dips in the middle when the two points are far apart
  const dist = Math.hypot(a.lng - b.lng, a.lat - b.lat);
  const dip = Math.min(2.5, dist * 60) * Math.sin(Math.PI * k);
  return {
    lng: a.lng + (b.lng - a.lng) * k,
    lat: a.lat + (b.lat - a.lat) * k,
    zoom: a.zoom + (b.zoom - a.zoom) * k - dip,
    pitch: a.pitch + (b.pitch - a.pitch) * k,
    bearing: lerpBearing(a.bearing, b.bearing, k),
  };
}

/** Camera for any frame of the script (pure, deterministic). */
export function cameraAtFrame(
  script: VlogScript,
  pins: RenderPin[],
  frame: number,
  fps: number = COMPOSITION.fps,
): Camera {
  const { index, local, length } = segmentAtFrame(script, frame, fps);
  const seg = script.segments[index]!;
  const overview = overviewCamera(pins);
  const pinCams = script.segments.map((s) => (s.type === 'pin' ? s.camera : null));
  const prevPinCam = (from: number): Camera => {
    for (let i = from - 1; i >= 0; i--) if (pinCams[i]) return pinCams[i]!;
    return overview;
  };
  if (seg.type === 'title') {
    const t = local / Math.max(1, length);
    return { ...overview, bearing: overview.bearing + t * 12, zoom: overview.zoom - 0.3 + t * 0.3 };
  }
  if (seg.type === 'pin') {
    const fly = flyoverFrames(fps);
    const from = prevPinCam(index);
    if (local < fly) return lerpCamera(from, seg.camera, easeInOut(local / fly));
    const t = (local - fly) / Math.max(1, length - fly);
    return { ...seg.camera, zoom: seg.camera.zoom + t * 0.25, bearing: seg.camera.bearing + t * 6 };
  }
  // outro: pull back to the whole route
  const fly = flyoverFrames(fps);
  const from = prevPinCam(index);
  if (local < fly) return lerpCamera(from, overview, easeInOut(local / fly));
  const t = (local - fly) / Math.max(1, length - fly);
  return { ...overview, bearing: overview.bearing + t * 10 };
}

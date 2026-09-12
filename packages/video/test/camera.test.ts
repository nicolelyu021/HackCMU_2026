import { describe, expect, it } from 'vitest';
import { buildRenderProps } from '@pinlog/schema';
import { demoBundle, demoScript } from '@pinlog/schema/fixtures';
import {
  cameraAtFrame,
  lerpCamera,
  overviewCamera,
  photoSlots,
  projectPins,
  segmentAtFrame,
} from '../src/index';

const props = buildRenderProps(demoScript(), demoBundle(), {
  files_base_url: 'http://localhost:8787/files',
  map_style_url: 'x',
  map_mode: 'static',
});

describe('pure composition math', () => {
  it('finds the segment at a frame', () => {
    expect(segmentAtFrame(props.script, 0)).toMatchObject({ index: 0, local: 0, length: 120 });
    expect(segmentAtFrame(props.script, 120)).toMatchObject({ index: 1, local: 0 });
    expect(segmentAtFrame(props.script, 125).local).toBe(5);
    const last = segmentAtFrame(props.script, 10_000);
    expect(last.index).toBe(props.script.segments.length - 1);
  });

  it('interpolates the camera during the flyover and holds it afterwards', () => {
    const start = cameraAtFrame(props.script, props.pins, 120); // first pin, local 0
    const mid = cameraAtFrame(props.script, props.pins, 120 + 22);
    const end = cameraAtFrame(props.script, props.pins, 120 + 45); // flyover = 1.5 s = 45 frames
    const pin1 = props.script.segments[1]!;
    if (pin1.type !== 'pin') throw new Error('expected pin');
    expect(end.lat).toBeCloseTo(pin1.camera.lat, 6);
    expect(end.lng).toBeCloseTo(pin1.camera.lng, 6);
    expect(Math.abs(start.lat - pin1.camera.lat)).toBeGreaterThan(
      Math.abs(mid.lat - pin1.camera.lat),
    );
    expect(mid.zoom).toBeLessThan(Math.max(start.zoom, pin1.camera.zoom)); // dips while flying
    const later = cameraAtFrame(props.script, props.pins, 120 + 45 + 60);
    expect(later.zoom).toBeGreaterThan(pin1.camera.zoom); // slow push-in
    const ov = overviewCamera(props.pins);
    expect(ov.zoom).toBeGreaterThanOrEqual(9);
    expect(ov.zoom).toBeLessThanOrEqual(15);
    expect(lerpCamera(ov, ov, 0.5)).toMatchObject({ lat: ov.lat, lng: ov.lng });
    expect(lerpCamera({ ...ov, bearing: 170 }, { ...ov, bearing: -170 }, 0.5).bearing).toBeCloseTo(
      180,
      5,
    );
  });

  it('splits photo time after the flyover and projects pins into a box', () => {
    const slots = photoSlots(3, 195); // 6.5 s
    expect(slots[0]!.start).toBe(45);
    expect(slots.at(-1)!.end).toBe(195);
    expect(slots[1]!.start).toBe(slots[0]!.end);
    const pts = projectPins(props.pins, { width: 1080, height: 1920, padding: 150 });
    expect(pts).toHaveLength(4);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(150);
      expect(p.x).toBeLessThanOrEqual(930);
      expect(p.y).toBeGreaterThanOrEqual(150);
      expect(p.y).toBeLessThanOrEqual(1770);
    }
  });
});

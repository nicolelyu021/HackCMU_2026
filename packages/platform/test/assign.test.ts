import { describe, expect, it } from 'vitest';
import { DEMO_PHOTO_SPECS, demoPins, photoCoords, photoTakenAt } from '@pinlog/schema/fixtures';
import { assignPhoto } from '../src/index';

describe('auto-assign (MAP-4)', () => {
  const pins = demoPins();

  it('lands every demo photo where the fixture expects (16 pins, 2 tray)', () => {
    let assigned = 0;
    for (const spec of DEMO_PHOTO_SPECS) {
      const coords = photoCoords(spec);
      const r = assignPhoto(
        pins,
        { taken_at: photoTakenAt(spec), lat: coords?.lat ?? null, lng: coords?.lng ?? null },
        { start_date: '2026-09-11' },
      );
      expect(r.pin_id, `${spec.id}: ${r.reason}`).toBe(spec.expected_pin_id);
      if (r.pin_id) assigned++;
    }
    expect(assigned).toBe(16);
  });

  it('explains itself', () => {
    const phippsNight = DEMO_PHOTO_SPECS.find((s) => s.id === 'media_pgh_04')!;
    const c = photoCoords(phippsNight)!;
    const r = assignPhoto(pins, { taken_at: photoTakenAt(phippsNight), ...c });
    expect(r.reason).toMatch(/same day/);
    expect(r.distance_m).toBeLessThan(300);
    const noGps = assignPhoto(pins, { taken_at: '2026-09-11T12:05:00', lat: null, lng: null });
    expect(noGps.reason).toMatch(/No GPS/);
    const far = assignPhoto(pins, { taken_at: '2026-09-11T08:10:00', lat: 40.4915, lng: -80.2329 });
    expect(far.pin_id).toBeNull();
    expect(far.reason).toMatch(/km away/);
    const fence = assignPhoto(pins, {
      taken_at: '2026-09-12T14:03:00',
      lat: 40.4431,
      lng: -79.9427,
    });
    expect(fence.pin_id).toBe('pin_pgh_d2_cmu');
    expect(fence.reason).toMatch(/within window/);
    const otherDay = assignPhoto(pins, {
      taken_at: '2026-09-20T14:03:00',
      lat: 40.4431,
      lng: -79.9427,
    });
    expect(otherDay.pin_id).toBeNull();
    const noTime = assignPhoto(pins, { taken_at: null, lat: 40.4431, lng: -79.9427 });
    expect(noTime.pin_id).toBe('pin_pgh_d2_cmu');
  });
});

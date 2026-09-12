import { describe, expect, it } from 'vitest';
import { LockedPinError, createMemoryRepo } from '../src/index';
import { demoFixtures, mockReplanDraft } from '../src/fixtures/index';

describe('memory repo (reference behaviour for the sqlite repo)', () => {
  it('seeds, bundles and orders', async () => {
    const repo = createMemoryRepo(demoFixtures());
    const bundle = await repo.trips.bundle('trip_pgh');
    expect(bundle?.pins.map((p) => p.id)[0]).toBe('pin_pgh_d1_cathedral');
    expect(bundle?.media).toHaveLength(21);
    expect((await repo.messages.listByTrip('trip_pgh')).every((m) => m.pin_id === null)).toBe(true);
    expect(await repo.messages.listByPin('pin_pgh_d1_cathedral')).toHaveLength(2);
  });

  it('creates a trip with defaults and deletes with cascade', async () => {
    const repo = createMemoryRepo();
    const trip = await repo.trips.create({
      destination: 'Kyoto',
      start_date: '2026-10-03',
      end_date: '2026-10-05',
      party: { size: 1 },
      interests: [],
      pace: 'moderate',
      budget: 'mid',
      language: 'en',
    });
    expect(trip.title).toBe('Kyoto');
    expect(trip.status).toBe('planning');
    await repo.pins.create({
      trip_id: trip.id,
      name: 'Fushimi Inari',
      place_id: 'osm:x',
      address: null,
      lat: 34.9671,
      lng: 135.7727,
      day_index: 1,
      order_index: 0,
      planned_start: null,
      planned_end: null,
      kind: 'poi',
      source: 'ai',
      ai_reason: null,
    });
    await repo.trips.delete(trip.id);
    expect(await repo.trips.get(trip.id)).toBeNull();
    expect(await repo.pins.listByTrip(trip.id)).toEqual([]);
  });

  it('applies a replan diff and refuses to touch user pins', async () => {
    const repo = createMemoryRepo(demoFixtures());
    const pins = await repo.pins.applyDiff('trip_pgh', { ...mockReplanDraft, added: [] });
    expect(pins.some((p) => p.id === 'pin_pgh_d2_schenley')).toBe(false);
    expect(pins.find((p) => p.id === 'pin_pgh_d2_strip')?.planned_end).toBe('2026-09-12T10:00:00');
    await expect(
      repo.pins.applyDiff('trip_pgh', {
        summary: '',
        added: [],
        changed: [],
        removed: [{ pin_id: 'pin_pgh_d1_primanti' }],
      }),
    ).rejects.toBeInstanceOf(LockedPinError);
  });
});

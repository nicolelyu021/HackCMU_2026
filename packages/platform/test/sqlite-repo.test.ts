import { describe, expect, it } from 'vitest';
import { LockedPinError, NotFoundError } from '@pinlog/schema';
import { demoRows, mockReplanDraft } from '@pinlog/schema/fixtures';
import { createRepo } from '../src/index';

const seeded = async () => {
  const repo = createRepo({ path: ':memory:' });
  await repo.importRows(demoRows());
  return repo;
};

describe('sqlite repo (must match the memory repo spec)', () => {
  it('imports fixture rows verbatim, bundles and orders', async () => {
    const repo = await seeded();
    const bundle = await repo.trips.bundle('trip_pgh');
    expect(bundle?.trip.title).toBe('Pittsburgh weekend');
    expect(bundle?.trip.party).toEqual({ size: 2, kind: 'friends' });
    expect(bundle?.pins.map((p) => p.id)[0]).toBe('pin_pgh_d1_cathedral');
    expect(bundle?.pins.at(-1)?.id).toBe('pin_pgh_d2_schenley');
    expect(bundle?.media).toHaveLength(18);
    expect(bundle?.media[0]?.id).toBe('media_pgh_18_far'); // ordered by taken_at (08:10 day 1)
    expect(bundle?.media.at(-1)?.id).toBe('media_pgh_16'); // 10:02 day 2
    expect(bundle?.entries).toHaveLength(7);
    expect((await repo.messages.listByTrip('trip_pgh')).every((m) => m.pin_id === null)).toBe(true);
    expect(await repo.messages.listByPin('pin_pgh_d1_cathedral')).toHaveLength(2);
    const vlog = await repo.vlogs.get('vlog_pgh_demo');
    expect(vlog?.status).toBe('done');
    expect(vlog?.script?.segments).toHaveLength(9);
    expect((await repo.vlogs.listByTrip('trip_pgh')).map((v) => v.id)).toEqual(['vlog_pgh_demo']);
  });

  it('creates a trip with defaults, updates it, and deletes with cascade', async () => {
    const repo = createRepo({ path: ':memory:' });
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
    expect((await repo.trips.list()).map((t) => t.id)).toEqual([trip.id]);
    const updated = await repo.trips.update(trip.id, {
      status: 'active',
      center_lat: 35,
      center_lng: 135.7,
    });
    expect(updated.status).toBe('active');
    expect(updated.center_lng).toBe(135.7);
    const pin = await repo.pins.create({
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
    await repo.entries.create({
      trip_id: trip.id,
      pin_id: pin.id,
      day_index: 1,
      text: 'hi',
      mood: null,
    });
    await repo.trips.delete(trip.id);
    expect(await repo.trips.get(trip.id)).toBeNull();
    expect(await repo.pins.listByTrip(trip.id)).toEqual([]);
    expect(await repo.entries.listByTrip(trip.id)).toEqual([]);
    await expect(repo.trips.delete(trip.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(repo.pins.update('nope', { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deleting a pin sends its photos back to the tray and drops its notes', async () => {
    const repo = await seeded();
    await repo.pins.delete('pin_pgh_d1_phipps');
    const m = await repo.media.get('media_pgh_03');
    expect(m?.pin_id).toBeNull();
    expect(m?.assign_method).toBe('none');
    expect(await repo.entries.listByPin('pin_pgh_d1_phipps')).toEqual([]);
    expect((await repo.trips.bundle('trip_pgh'))?.pins).toHaveLength(8);
  });

  it('reorders atomically and rejects unknown pins', async () => {
    const repo = await seeded();
    const pins = await repo.pins.reorder('trip_pgh', [
      { pin_id: 'pin_pgh_d1_cathedral', day_index: 1, order_index: 1 },
      { pin_id: 'pin_pgh_d1_phipps', day_index: 1, order_index: 0 },
    ]);
    expect(pins.slice(0, 2).map((p) => p.id)).toEqual([
      'pin_pgh_d1_phipps',
      'pin_pgh_d1_cathedral',
    ]);
    await expect(
      repo.pins.reorder('trip_pgh', [{ pin_id: 'ghost', day_index: 1, order_index: 0 }]),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('applies a replan diff and refuses to touch user pins (rolled back)', async () => {
    const repo = await seeded();
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
    expect(await repo.pins.get('pin_pgh_d1_primanti')).not.toBeNull();
    const withAdd = await repo.pins.applyDiff('trip_pgh', {
      summary: 'add',
      changed: [],
      removed: [],
      added: [
        {
          name: 'Randyland',
          place_id: 'mock:randyland',
          address: null,
          lat: 40.4573,
          lng: -80.0125,
          day_index: 2,
          order_index: 99,
          planned_start: null,
          planned_end: null,
          kind: 'poi',
          source: 'ai',
          ai_reason: 'colour',
        },
      ],
    });
    expect(withAdd.find((p) => p.name === 'Randyland')?.order_index).toBe(99);
  });

  it('media patching and vlog lifecycle', async () => {
    const repo = await seeded();
    const moved = await repo.media.update('media_pgh_17_nogps', {
      pin_id: 'pin_pgh_d1_phipps',
      assign_method: 'manual',
    });
    expect(moved.pin_id).toBe('pin_pgh_d1_phipps');
    expect((await repo.media.listByPin('pin_pgh_d1_phipps')).map((m) => m.id)).toContain(
      'media_pgh_17_nogps',
    );
    const v = await repo.vlogs.create({
      trip_id: 'trip_pgh',
      settings: { language: 'en', voice: 'warm_female', music_mood: 'calm', target_length_s: 60 },
    });
    expect(v.status).toBe('queued');
    const failed = await repo.vlogs.update(v.id, { status: 'failed', error: 'boom' });
    expect(failed.error).toBe('boom');
    expect(failed.updated_at >= v.updated_at).toBe(true);
    expect((await repo.vlogs.listByTrip('trip_pgh')).map((x) => x.id)[0]).toBe(v.id);
  });
});

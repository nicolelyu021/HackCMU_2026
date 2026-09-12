import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createMemoryRepo, createMemoryStorage } from '@pinlog/schema';
import { DEMO_PHOTO_SPECS, demoFixtures, photoCoords, photoTakenAt } from '@pinlog/schema/fixtures';
import { generateDemoPhoto, ingestPhoto, readExif, seedFixtures, sniffMime } from '../src/index';

describe('exif + ingest', () => {
  let tmp = '';
  afterAll(async () => tmp && (await rm(tmp, { recursive: true, force: true })));

  it('generated demo photos carry GPS + DateTimeOriginal that read back', async () => {
    const spec = DEMO_PHOTO_SPECS.find((s) => s.id === 'media_pgh_05')!;
    const bytes = await generateDemoPhoto(spec);
    expect(sniffMime(bytes)).toBe('image/jpeg');
    const exif = await readExif(bytes);
    const c = photoCoords(spec)!;
    expect(exif.taken_at).toBe(photoTakenAt(spec));
    expect(exif.lat).toBeCloseTo(c.lat, 4);
    expect(exif.lng).toBeCloseTo(c.lng, 4);
    expect(exif.exif).toMatchObject({ make: 'Pinlog', orientation: 1, offset_time: '-04:00' });
    expect(exif.width).toBe(1600);
  });

  it('readExif tolerates bytes without EXIF', async () => {
    expect(await readExif(new Uint8Array([1, 2, 3, 4]))).toMatchObject({
      taken_at: null,
      lat: null,
    });
  });

  it('ingests a photo: stores original + thumb, lands on the expected pin, trusts client meta', async () => {
    const repo = createMemoryRepo(demoFixtures());
    const storage = createMemoryStorage();
    const spec = DEMO_PHOTO_SPECS.find((s) => s.id === 'media_pgh_14')!;
    const bytes = await generateDemoPhoto(spec);
    const r = await ingestPhoto(
      { repo, storage },
      { trip_id: 'trip_pgh', bytes, meta: { name: 'strip.jpg' } },
    );
    expect(r.assigned_pin_id).toBe('pin_pgh_d2_strip');
    expect(r.reason).toMatch(/within window/);
    expect(r.media.assign_method).toBe('auto');
    expect(r.media.width).toBe(1600);
    expect(r.media.height).toBe(1200);
    expect(r.media.mime).toBe('image/jpeg');
    expect(await storage.exists(r.media.storage_path)).toBe(true);
    expect(await storage.exists(r.media.thumb_path)).toBe(true);
    expect((await storage.get(r.media.thumb_path))!.byteLength).toBeLessThan(bytes.byteLength);
    // client meta wins over EXIF (browser read it first)
    const r2 = await ingestPhoto(
      { repo, storage },
      {
        trip_id: 'trip_pgh',
        bytes,
        meta: { name: 'fence.jpg', taken_at: '2026-09-12T14:03:00', lat: 40.4431, lng: -79.9427 },
      },
    );
    expect(r2.assigned_pin_id).toBe('pin_pgh_d2_cmu');
    // no GPS → tray
    const r3 = await ingestPhoto(
      { repo, storage },
      {
        trip_id: 'trip_pgh',
        bytes,
        meta: { name: 'nogps.jpg', taken_at: null, lat: null, lng: null },
      },
    );
    expect(r3.assigned_pin_id).toBeNull();
    expect(r3.media.assign_method).toBe('none');
    expect((await repo.media.listByTrip('trip_pgh')).length).toBe(24);
  });

  it('seeds rows (skip photos), is idempotent, resets on demand, writes files when asked', async () => {
    tmp = await mkdtemp(join(tmpdir(), 'pinlog-seed-'));
    const repo = createMemoryRepo();
    const storage = createMemoryStorage();
    const log: string[] = [];
    const a = await seedFixtures({ repo, storage }, { photos: 'skip', log: (l) => log.push(l) });
    expect(a).toMatchObject({
      trip_id: 'trip_pgh',
      pins: 9,
      media: 21,
      entries: 8,
      vlog_id: 'vlog_pgh_demo',
      seeded: true,
    });
    expect((await repo.trips.bundle('trip_pgh'))?.pins).toHaveLength(9);
    const b = await seedFixtures({ repo, storage }, { photos: 'skip', log: (l) => log.push(l) });
    expect(b.seeded).toBe(false);
    expect(log.some((l) => /already exists/.test(l))).toBe(true);
    // reset + two real photos into a temp fixture dir, plus audio
    const specs = DEMO_PHOTO_SPECS.slice(0, 2);
    const c = await seedFixtures(
      { repo, storage },
      {
        reset: true,
        photos: 'generate',
        photos_dir: tmp,
        audio: (s) => new Uint8Array(Math.round(s * 10)),
        log: (l) => log.push(l),
      },
    );
    expect(c.seeded).toBe(true);
    for (const s of specs) {
      expect(await storage.exists(`trips/trip_pgh/media/${s.id}.jpg`)).toBe(true);
      expect(await storage.exists(`trips/trip_pgh/thumbs/${s.id}.jpg`)).toBe(true);
    }
    expect(await storage.exists('vlogs/vlog_pgh_demo/seg_01.wav')).toBe(true);
    expect(await storage.exists('vlogs/vlog_pgh_demo/seg_07.wav')).toBe(true);
  }, 60_000);
});

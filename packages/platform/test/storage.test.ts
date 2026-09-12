import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createStorage } from '../src/index';

describe('local storage', () => {
  let root = '';
  afterAll(async () => root && (await rm(root, { recursive: true, force: true })));

  it('puts, gets, deletes, and removes whole prefixes', async () => {
    root = await mkdtemp(join(tmpdir(), 'pinlog-storage-'));
    const s = createStorage({ kind: 'local', root });
    const bytes = new Uint8Array([1, 2, 3]);
    await s.put('trips/t1/media/a.jpg', bytes, 'image/jpeg');
    await s.put('trips/t1/thumbs/a.jpg', bytes, 'image/jpeg');
    await s.put('vlogs/v1/seg_01.wav', bytes, 'audio/wav');
    expect(await s.exists('trips/t1/media/a.jpg')).toBe(true);
    expect(Array.from((await s.get('trips/t1/media/a.jpg'))!)).toEqual([1, 2, 3]);
    expect(await s.get('trips/t1/media/missing.jpg')).toBeNull();
    await s.delete('trips/t1/thumbs/a.jpg');
    expect(await s.exists('trips/t1/thumbs/a.jpg')).toBe(false);
    await s.deletePrefix('trips/t1/');
    expect(await s.exists('trips/t1/media/a.jpg')).toBe(false);
    expect(await s.exists('vlogs/v1/seg_01.wav')).toBe(true);
    await s.deletePrefix('vlogs/v1/seg_');
    expect(await s.exists('vlogs/v1/seg_01.wav')).toBe(false);
    await expect(s.get('../etc/passwd')).rejects.toThrow(/invalid storage key/);
  });
});

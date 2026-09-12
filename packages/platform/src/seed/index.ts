import sharp from 'sharp';
import { SEGMENT_PADDING_S, storageKeys, type Ports } from '@pinlog/schema';
import {
  DEMO_DEFAULT_START,
  DEMO_TRIP_ID,
  DEMO_VLOG_ID,
  demoFixtures,
  demoRows,
} from '@pinlog/schema/fixtures';
import { THUMB_PX } from '../ingest/image';
import { loadOrGenerateDemoPhoto } from './photos';

export interface SeedOptions {
  start_date?: string;
  reset?: boolean;
  /** copy = copy committed fixture JPEGs into storage (default; generates them first if missing); generate = regenerate them; skip = rows only, no files (tests). */
  photos?: 'copy' | 'generate' | 'skip';
  /**
   * Produces the narration audio for the seeded vlog's segments (a WAV of `seconds` length). The API's seed CLI passes
   * @pinlog/tts silentWav; omit to skip audio (the Player then plays captions only).
   */
  audio?: (seconds: number) => Uint8Array;
  /** Where the committed JPEGs live (tests point this at a temp dir). */
  photos_dir?: string;
  log?: (line: string) => void;
}
export interface SeedResult {
  trip_id: string;
  pins: number;
  media: number;
  entries: number;
  vlog_id: string;
  /** false when the trip already existed and reset was not requested (nothing written). */
  seeded: boolean;
}

/** Owner B. Inserts the demo trip with its frozen ids. Idempotent: an existing trip is left alone unless `reset`. */
export async function seedFixtures(
  ports: Pick<Ports, 'repo' | 'storage'>,
  opts: SeedOptions = {},
): Promise<SeedResult> {
  const log = opts.log ?? ((line: string) => console.log(`[seed] ${line}`));
  const start_date = opts.start_date ?? DEMO_DEFAULT_START;
  const f = demoFixtures(start_date);
  const { repo, storage } = ports;

  const existing = await repo.trips.get(DEMO_TRIP_ID);
  if (existing) {
    if (!opts.reset) {
      log(`trip ${DEMO_TRIP_ID} already exists — use --reset to recreate it`);
      return {
        trip_id: DEMO_TRIP_ID,
        pins: f.pins.length,
        media: f.media.length,
        entries: f.entries.length,
        vlog_id: DEMO_VLOG_ID,
        seeded: false,
      };
    }
    log(`removing existing trip ${DEMO_TRIP_ID}`);
    await repo.trips.delete(DEMO_TRIP_ID);
    await storage.deletePrefix(`trips/${DEMO_TRIP_ID}/`);
    await storage.deletePrefix(`vlogs/${DEMO_VLOG_ID}/`);
  }

  await repo.importRows(demoRows(start_date));
  log(
    `rows: 1 trip, ${f.pins.length} pins, ${f.media.length} media, ${f.entries.length} entries, ${f.messages.length} messages, 1 vlog (start ${start_date})`,
  );

  const photos = opts.photos ?? 'copy';
  if (photos !== 'skip') {
    let generated = 0;
    for (const spec of f.photoSpecs) {
      const row = f.media.find((m) => m.id === spec.id)!;
      const { bytes, generated: g } = await loadOrGenerateDemoPhoto(spec, {
        dir: opts.photos_dir,
        regenerate: photos === 'generate',
        start_date,
      });
      if (g) generated++;
      const thumb = await sharp(bytes)
        .rotate()
        .resize(THUMB_PX, THUMB_PX, { fit: 'inside' })
        .jpeg({ quality: 82 })
        .toBuffer();
      await storage.put(row.storage_path, bytes, 'image/jpeg');
      await storage.put(row.thumb_path, new Uint8Array(thumb), 'image/jpeg');
    }
    log(`photos: ${f.photoSpecs.length} originals + thumbs in storage (${generated} generated)`);
  }

  if (opts.audio) {
    let n = 0;
    f.script.segments.forEach((seg, i) => {
      if (seg.type !== 'pin' || !seg.audio_path) return;
      const seconds = Math.max(0.5, seg.duration_s - SEGMENT_PADDING_S);
      void storage.put(
        storageKeys.segmentAudio(DEMO_VLOG_ID, i),
        opts.audio!(seconds),
        'audio/wav',
      );
      n++;
    });
    log(`audio: ${n} narration WAVs for ${DEMO_VLOG_ID}`);
  }

  return {
    trip_id: DEMO_TRIP_ID,
    pins: f.pins.length,
    media: f.media.length,
    entries: f.entries.length,
    vlog_id: DEMO_VLOG_ID,
    seeded: true,
  };
}

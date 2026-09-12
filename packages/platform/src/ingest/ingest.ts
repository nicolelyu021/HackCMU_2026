import {
  extensionOf,
  storageKeys,
  type Media,
  type Ports,
  type UploadMediaMeta,
} from '@pinlog/schema';
import { assignPhoto } from './assign';
import { readExif } from './exif';
import { processImage, sniffMime } from './image';

export interface IngestInput {
  trip_id: string;
  bytes: Uint8Array;
  meta: UploadMediaMeta;
}
export interface IngestResult {
  media: Media;
  assigned_pin_id: string | null;
  /** Human-readable explanation shown in the landing HUD, e.g. "180 m from Phipps · within window". */
  reason: string;
  distance_m: number | null;
}

/**
 * Owner B. Upload IS ingest (no webhook): trust the browser's EXIF summary when present, re-read it otherwise,
 * store original + thumb, auto-assign to a pin, insert the media row.
 */
export async function ingestPhoto(
  ports: Pick<Ports, 'repo' | 'storage'>,
  input: IngestInput,
): Promise<IngestResult> {
  const { repo, storage } = ports;
  const trip = await repo.trips.get(input.trip_id);
  if (!trip) throw new Error(`trip ${input.trip_id} not found`);

  const exif = await readExif(input.bytes);
  const taken_at = input.meta.taken_at !== undefined ? input.meta.taken_at : exif.taken_at;
  const hasClientGps = input.meta.lat !== undefined && input.meta.lng !== undefined;
  const lat = hasClientGps ? input.meta.lat! : exif.lat;
  const lng = hasClientGps ? input.meta.lng! : exif.lng;

  const mime = sniffMime(input.bytes, input.meta.mime ?? input.meta.name);
  const ext =
    mime === 'application/octet-stream' ? extensionOf(input.meta.name) : extensionOf(mime);
  const id = globalThis.crypto.randomUUID();
  const storage_path = storageKeys.media(input.trip_id, id, ext);
  const thumb_path = storageKeys.thumb(input.trip_id, id);

  const image = await processImage(input.bytes, {
    width: exif.width,
    height: exif.height,
    orientation: exif.exif?.orientation,
  });
  await storage.put(storage_path, input.bytes, mime);
  await storage.put(thumb_path, image.thumb, 'image/jpeg');

  const pins = await repo.pins.listByTrip(input.trip_id);
  const assigned = assignPhoto(pins, { taken_at, lat, lng }, { start_date: trip.start_date });

  const media = await repo.media.create({
    trip_id: input.trip_id,
    pin_id: assigned.pin_id,
    storage_path,
    thumb_path,
    width: image.width,
    height: image.height,
    mime,
    taken_at,
    lat,
    lng,
    exif: exif.exif,
    caption: null,
    assign_method: assigned.pin_id ? 'auto' : 'none',
  });
  return {
    media,
    assigned_pin_id: assigned.pin_id,
    reason: assigned.reason,
    distance_m: assigned.distance_m,
  };
}

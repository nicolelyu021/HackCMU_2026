import exifr from 'exifr';
import { fromExifDate, type UploadMediaMeta } from '@pinlog/schema';

/**
 * Read EXIF in the browser BEFORE upload (docs/ARCHITECTURE.md gotcha 6): DateTimeOriginal is kept as a naive
 * trip-local wall clock (reviveValues:false — never let the browser timezone touch it). Works for JPEG and HEIC.
 */
export async function readPhotoMeta(file: File): Promise<UploadMediaMeta> {
  const meta: UploadMediaMeta = {
    name: file.name,
    mime: file.type || undefined,
    taken_at: null,
    lat: null,
    lng: null,
  };
  try {
    const out = (await exifr.parse(file, {
      exif: true,
      gps: true,
      reviveValues: false,
      translateValues: false,
      translateKeys: true,
    })) as Record<string, unknown> | undefined;
    if (out) {
      const raw = (out.DateTimeOriginal ?? out.CreateDate ?? out.DateTime) as string | undefined;
      meta.taken_at = fromExifDate(typeof raw === 'string' ? raw : null);
      const lat = out.latitude;
      const lng = out.longitude;
      if (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        meta.lat = lat;
        meta.lng = lng;
      }
    }
  } catch {
    /* no EXIF: the server re-checks and the tray catches the rest */
  }
  return meta;
}

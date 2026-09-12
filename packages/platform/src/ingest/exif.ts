import exifr from 'exifr';
import { fromExifDate, type MediaExif } from '@pinlog/schema';

export interface ExifSummary {
  taken_at: string | null;
  lat: number | null;
  lng: number | null;
  exif: MediaExif | null;
  /** Pixel size from the EXIF (pre-orientation), when present. */
  width: number | null;
  height: number | null;
}

const EMPTY: ExifSummary = {
  taken_at: null,
  lat: null,
  lng: null,
  exif: null,
  width: null,
  height: null,
};

/**
 * Server-side EXIF read (the browser normally did this already; this is the fallback and the seed's verification).
 * Values stay raw: DateTimeOriginal is a naive wall clock (no timezone in EXIF), never revived into a Date.
 */
export async function readExif(bytes: Uint8Array): Promise<ExifSummary> {
  let out: Record<string, unknown> | undefined;
  try {
    out = (await exifr.parse(bytes, {
      exif: true,
      gps: true,
      reviveValues: false,
      translateValues: false,
      translateKeys: true,
    })) as Record<string, unknown> | undefined;
  } catch {
    return EMPTY;
  }
  if (!out) return EMPTY;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const lat = num(out.latitude);
  const lng = num(out.longitude);
  const exif: MediaExif = {};
  if (str(out.Make)) exif.make = str(out.Make);
  if (str(out.Model)) exif.model = str(out.Model);
  if (num(out.Orientation) !== null) exif.orientation = num(out.Orientation)!;
  if (str(out.OffsetTimeOriginal)) exif.offset_time = str(out.OffsetTimeOriginal);
  return {
    taken_at: fromExifDate(str(out.DateTimeOriginal) ?? str(out.CreateDate) ?? str(out.DateTime)),
    lat: lat !== null && lng !== null ? lat : null,
    lng: lat !== null && lng !== null ? lng : null,
    exif: Object.keys(exif).length ? exif : null,
    width: num(out.ExifImageWidth) ?? num(out.ImageWidth),
    height: num(out.ExifImageHeight) ?? num(out.ImageHeight),
  };
}

import sharp from 'sharp';

export const THUMB_PX = 512;

export interface ProcessedImage {
  width: number;
  height: number;
  thumb: Uint8Array;
  /** false when the format could not be decoded (HEIC on prebuilt sharp): dimensions are guesses, thumb is a placeholder. */
  decoded: boolean;
}

/** Sniff the mime type from magic bytes; falls back to the hint. */
export function sniffMime(bytes: Uint8Array, hint?: string): string {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!);
    if (/heic|heix|hevc|mif1|msf1/.test(brand)) return 'image/heic';
  }
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  return hint && hint.includes('/') ? hint : 'application/octet-stream';
}

/** Placeholder thumb for images sharp cannot decode (e.g. HEIC without libheif). */
async function placeholderThumb(label: string): Promise<Uint8Array> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${THUMB_PX}" height="${Math.round(
    THUMB_PX * 0.75,
  )}"><rect width="100%" height="100%" fill="#1f2937"/><text x="50%" y="50%" fill="#9ca3af" font-size="28" font-family="Helvetica, Arial, sans-serif" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
  return new Uint8Array(await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer());
}

/** Auto-orients, measures, and makes a ≤ 512 px JPEG thumb. The original bytes are stored untouched (EXIF intact). */
export async function processImage(
  bytes: Uint8Array,
  fallback: { width: number | null; height: number | null; orientation?: number },
): Promise<ProcessedImage> {
  try {
    const img = sharp(bytes, { failOn: 'none' });
    const meta = await img.metadata();
    const swap = (meta.orientation ?? 1) >= 5;
    const width = swap ? meta.height : meta.width;
    const height = swap ? meta.width : meta.height;
    const thumb = await sharp(bytes, { failOn: 'none' })
      .rotate()
      .resize(THUMB_PX, THUMB_PX, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    if (!width || !height) throw new Error('no dimensions');
    return { width, height, thumb: new Uint8Array(thumb), decoded: true };
  } catch {
    const swap = (fallback.orientation ?? 1) >= 5;
    const w = fallback.width ?? 1200;
    const h = fallback.height ?? 1600;
    return {
      width: swap ? h : w,
      height: swap ? w : h,
      thumb: await placeholderThumb('preview unavailable'),
      decoded: false,
    };
  }
}

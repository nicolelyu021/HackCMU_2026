'use client';
import { useCallback, useRef, useState } from 'react';
import type { Pin, UploadMediaResponse } from '@pinlog/schema';
import { api } from '@/lib/api';
import { readPhotoMeta } from '@/lib/exif';

export interface LandingResult {
  media_id: string;
  thumb_path: string;
  pin: Pin | null;
  reason: string;
  distance_m: number | null;
  name: string;
}

/** MAP-4: EXIF in the browser → upload in batches of 4 → landing results per file (docs/ARCHITECTURE.md gotcha 8). */
export function usePhotoUpload(opts: {
  tripId: string;
  pins: Pin[];
  onLanded: (results: LandingResult[]) => void;
  onError: (err: unknown) => void;
  onDone: () => void;
}) {
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter(
        (f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name),
      );
      if (files.length === 0) return;
      setUploading({ done: 0, total: files.length });
      try {
        const metas = await Promise.all(files.map(readPhotoMeta));
        for (let i = 0; i < files.length; i += 4) {
          const batchFiles = files.slice(i, i + 4);
          const res: UploadMediaResponse = await api.uploadMedia(
            opts.tripId,
            batchFiles,
            metas.slice(i, i + 4),
          );
          opts.onLanded(
            res.results.map((r, j) => ({
              media_id: r.media_id,
              thumb_path: res.media[j]!.thumb_path,
              pin: r.pin_id ? (opts.pins.find((p) => p.id === r.pin_id) ?? null) : null,
              reason: r.reason,
              distance_m: r.distance_m,
              name: batchFiles[j]!.name,
            })),
          );
          setUploading({ done: Math.min(files.length, i + 4), total: files.length });
        }
        opts.onDone();
      } catch (err) {
        opts.onError(err);
      } finally {
        setUploading(null);
      }
    },
    [opts],
  );

  const openPicker = () => inputRef.current?.click();
  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*,.heic,.heif"
      multiple
      className="hidden"
      onChange={(e) => {
        if (e.target.files) void upload(e.target.files);
        e.target.value = '';
      }}
    />
  );
  return { upload, uploading, openPicker, input };
}

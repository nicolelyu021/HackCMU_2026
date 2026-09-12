import { z } from 'zod';
import { Id, Latitude, Longitude } from './common';
import { Media } from './media';
import { Pin } from './pin';
import { VlogScript } from './script';
import { fileUrl } from './storage-keys';

// ---- Everything the Remotion composition needs, with URLs already resolved (the D ↔ A ↔ render-CLI contract) ----

export const RenderMedia = z.object({
  url: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type RenderMedia = z.infer<typeof RenderMedia>;

export const RenderPin = z.object({
  id: Id,
  name: z.string(),
  lat: Latitude,
  lng: Longitude,
  day_index: z.number().int().min(1),
  order_index: z.number().int().min(0),
});
export type RenderPin = z.infer<typeof RenderPin>;

export const MapMode = z.enum(['maplibre', 'static']);
export type MapMode = z.infer<typeof MapMode>;

export const VlogRenderProps = z.object({
  script: VlogScript,
  /** media_id → displayable image. */
  media: z.record(z.string(), RenderMedia),
  /** All pins of the trip in day/order (for the outro route and the static map fallback). */
  pins: z.array(RenderPin),
  /** audio_path keys resolve with fileUrl(files_base_url, key). */
  files_base_url: z.string(),
  music_url: z.string().nullable(),
  map_style_url: z.string(),
  /** maplibre = live WebGL flyover; static = deterministic SVG route card (used for MP4 render). */
  map_mode: MapMode,
});
export type VlogRenderProps = z.infer<typeof VlogRenderProps>;

export interface BuildRenderPropsOptions {
  files_base_url: string;
  map_style_url: string;
  map_mode?: MapMode;
  music_url?: string | null;
  /** Override how a media row becomes a URL (Remotion Studio uses staticFile()). */
  media_url?: (m: Media) => string;
}

/** Pure. Only media referenced by the script are included. */
export function buildRenderProps(
  script: VlogScript,
  bundle: { pins: Pin[]; media: Media[] },
  opts: BuildRenderPropsOptions,
): VlogRenderProps {
  const wanted = new Set<string>();
  for (const seg of script.segments) {
    if (seg.type === 'pin') for (const p of seg.photos) wanted.add(p.media_id);
  }
  const media: Record<string, RenderMedia> = {};
  for (const m of bundle.media) {
    if (!wanted.has(m.id)) continue;
    media[m.id] = {
      url: opts.media_url ? opts.media_url(m) : fileUrl(opts.files_base_url, m.storage_path),
      width: m.width,
      height: m.height,
    };
  }
  const pins = [...bundle.pins]
    .sort((a, b) => a.day_index - b.day_index || a.order_index - b.order_index)
    .map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      day_index: p.day_index,
      order_index: p.order_index,
    }));
  return {
    script,
    media,
    pins,
    files_base_url: opts.files_base_url,
    music_url: opts.music_url ?? null,
    map_style_url: opts.map_style_url,
    map_mode: opts.map_mode ?? 'maplibre',
  };
}

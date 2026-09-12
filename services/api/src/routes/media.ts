import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { ingestPhoto } from '@pinlog/platform';
import { UpdateMediaInput, UploadMediaMeta, type UploadMediaResponse } from '@pinlog/schema';
import { notFound, validation } from '../errors';
import { validate } from '../lib/validate';
import type { AppEnv } from '../types';

/**
 * Owner B. POST /trips/:id/media — multipart: `files` (one or many) + `meta` (JSON UploadMediaMeta[] in file order,
 * optional). Upload IS ingest: EXIF, thumb, auto-assign, media row. PATCH/DELETE /media/:id.
 */
export const mediaRoutes = new Hono<AppEnv>();

const MetaList = z.array(UploadMediaMeta);

mediaRoutes.post(
  '/trips/:id/media',
  bodyLimit({
    maxSize: 50 * 1024 * 1024,
    onError: (c) =>
      c.json({ error: { code: 'validation', message: 'Upload larger than 50 MB' } }, 413),
  }),
  async (c) => {
    const { repo, storage } = c.get('container').ports;
    const trip_id = c.req.param('id');
    if (!(await repo.trips.get(trip_id))) throw notFound('trip', trip_id);

    const body = await c.req.parseBody({ all: true });
    const raw = body['files'] ?? body['file'] ?? body['files[]'];
    const files = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(
      (f): f is File => typeof f === 'object' && f !== null && 'arrayBuffer' in f,
    );
    if (files.length === 0) throw validation('multipart field "files" is required');

    let metas: UploadMediaMeta[] = [];
    const metaRaw = body['meta'];
    if (typeof metaRaw === 'string' && metaRaw.trim()) {
      const parsed = MetaList.safeParse(JSON.parse(metaRaw));
      if (!parsed.success) throw validation('meta must be UploadMediaMeta[]', parsed.error.issues);
      metas = parsed.data;
    }

    const out: UploadMediaResponse = { media: [], results: [] };
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const meta = metas[i] ?? {
        name: file.name || `photo-${i + 1}.jpg`,
        mime: file.type || undefined,
      };
      const r = await ingestPhoto(
        { repo, storage },
        {
          trip_id,
          bytes: new Uint8Array(await file.arrayBuffer()),
          meta: {
            ...meta,
            name: meta.name || file.name || `photo-${i + 1}`,
            mime: meta.mime ?? (file.type || undefined),
          },
        },
      );
      out.media.push(r.media);
      out.results.push({
        media_id: r.media.id,
        pin_id: r.assigned_pin_id,
        reason: r.reason,
        distance_m: r.distance_m,
      });
    }
    return c.json(out, 201);
  },
);

mediaRoutes.patch('/media/:id', validate('json', UpdateMediaInput), async (c) => {
  const { repo } = c.get('container').ports;
  const input = c.req.valid('json');
  const patch: Parameters<typeof repo.media.update>[1] = {};
  if (input.pin_id !== undefined) {
    if (input.pin_id !== null && !(await repo.pins.get(input.pin_id)))
      throw notFound('pin', input.pin_id);
    patch.pin_id = input.pin_id;
    patch.assign_method = input.pin_id === null ? 'none' : 'manual';
  }
  if (input.caption !== undefined) patch.caption = input.caption;
  const media = await repo.media.update(c.req.param('id'), patch);
  return c.json(media);
});

mediaRoutes.delete('/media/:id', async (c) => {
  const { repo, storage } = c.get('container').ports;
  const m = await repo.media.get(c.req.param('id'));
  if (!m) throw notFound('media', c.req.param('id'));
  await repo.media.delete(m.id);
  await storage.delete(m.storage_path);
  await storage.delete(m.thumb_path);
  return c.body(null, 204);
});

import { Hono } from 'hono';
import type { Media, TripBundle, Vlog } from '@pinlog/schema';
import { notFound } from '../errors';
import type { AppEnv } from '../types';

/** Owner B. Stretch: POST /trips/:id/share → share_slug; GET /share/:slug → bundle + latest vlog, media stripped of GPS/EXIF. */
export const shareRoutes = new Hono<AppEnv>();

const slugFor = (title: string) =>
  `${
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'trip'
  }-${Math.random().toString(36).slice(2, 7)}`;

shareRoutes.post('/trips/:id/share', async (c) => {
  const { repo } = c.get('container').ports;
  const trip = await repo.trips.get(c.req.param('id'));
  if (!trip) throw notFound('trip', c.req.param('id'));
  const share_slug = trip.share_slug ?? slugFor(trip.title);
  const updated = await repo.trips.update(trip.id, { visibility: 'link', share_slug });
  return c.json(updated);
});

const strip = (m: Media): Media => ({ ...m, lat: null, lng: null, exif: null });

shareRoutes.get('/share/:slug', async (c) => {
  const { repo } = c.get('container').ports;
  const trip = await repo.trips.getBySlug(c.req.param('slug'));
  if (!trip || trip.visibility !== 'link') throw notFound('shared trip');
  const bundle = (await repo.trips.bundle(trip.id))!;
  const vlogs = await repo.vlogs.listByTrip(trip.id);
  const vlog: Vlog | null = vlogs.find((v) => v.status === 'done') ?? null;
  const body: TripBundle & { vlog: Vlog | null } = {
    ...bundle,
    media: bundle.media.map(strip),
    vlog,
  };
  return c.json(body);
});

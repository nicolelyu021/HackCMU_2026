import { Hono } from 'hono';
import { CreateTripInput, UpdateTripInput, type TripsResponse } from '@pinlog/schema';
import { notFound } from '../errors';
import { validate } from '../lib/validate';
import type { AppEnv } from '../types';

/** Owner B. Trips CRUD + GET /trips/:id bundle + DELETE cascade (files via storage.deletePrefix). */
export const tripsRoutes = new Hono<AppEnv>();

tripsRoutes.get('/trips', async (c) => {
  const body: TripsResponse = { trips: await c.get('container').ports.repo.trips.list() };
  return c.json(body);
});

tripsRoutes.post('/trips', validate('json', CreateTripInput), async (c) => {
  const trip = await c.get('container').ports.repo.trips.create(c.req.valid('json'));
  return c.json(trip, 201);
});

tripsRoutes.get('/trips/:id', async (c) => {
  const bundle = await c.get('container').ports.repo.trips.bundle(c.req.param('id'));
  if (!bundle) throw notFound('trip', c.req.param('id'));
  return c.json(bundle);
});

tripsRoutes.patch('/trips/:id', validate('json', UpdateTripInput), async (c) => {
  const trip = await c
    .get('container')
    .ports.repo.trips.update(c.req.param('id'), c.req.valid('json'));
  return c.json(trip);
});

tripsRoutes.delete('/trips/:id', async (c) => {
  const { repo, storage } = c.get('container').ports;
  const id = c.req.param('id');
  const vlogs = await repo.vlogs.listByTrip(id);
  await repo.trips.delete(id);
  await storage.deletePrefix(`trips/${id}/`);
  for (const v of vlogs) await storage.deletePrefix(`vlogs/${v.id}/`);
  return c.body(null, 204);
});

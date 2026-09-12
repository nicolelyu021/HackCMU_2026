import { Hono } from 'hono';
import { CreateEntryInput } from '@pinlog/schema';
import { notFound } from '../errors';
import { validate } from '../lib/validate';
import type { AppEnv } from '../types';

/** Owner B. Journal entries: POST /pins/:id/entries, POST /trips/:id/entries, DELETE /entries/:id. */
export const entriesRoutes = new Hono<AppEnv>();

entriesRoutes.post('/pins/:id/entries', validate('json', CreateEntryInput), async (c) => {
  const { repo } = c.get('container').ports;
  const pin = await repo.pins.get(c.req.param('id'));
  if (!pin) throw notFound('pin', c.req.param('id'));
  const input = c.req.valid('json');
  const entry = await repo.entries.create({
    trip_id: pin.trip_id,
    pin_id: pin.id,
    day_index: input.day_index ?? pin.day_index,
    text: input.text,
    mood: input.mood ?? null,
  });
  return c.json(entry, 201);
});

entriesRoutes.post('/trips/:id/entries', validate('json', CreateEntryInput), async (c) => {
  const { repo } = c.get('container').ports;
  const trip_id = c.req.param('id');
  if (!(await repo.trips.get(trip_id))) throw notFound('trip', trip_id);
  const input = c.req.valid('json');
  const entry = await repo.entries.create({
    trip_id,
    pin_id: null,
    day_index: input.day_index ?? null,
    text: input.text,
    mood: input.mood ?? null,
  });
  return c.json(entry, 201);
});

entriesRoutes.delete('/entries/:id', async (c) => {
  await c.get('container').ports.repo.entries.delete(c.req.param('id'));
  return c.body(null, 204);
});

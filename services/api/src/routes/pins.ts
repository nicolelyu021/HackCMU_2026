import { Hono } from 'hono';
import {
  CreatePinInput,
  ReorderPinsInput,
  UpdatePinInput,
  type PinsResponse,
} from '@pinlog/schema';
import { notFound } from '../errors';
import { validate } from '../lib/validate';
import type { AppEnv } from '../types';

/** Owner B. Pins create/update/delete + PUT /trips/:id/pins/order. */
export const pinsRoutes = new Hono<AppEnv>();

pinsRoutes.post('/trips/:id/pins', validate('json', CreatePinInput), async (c) => {
  const { repo } = c.get('container').ports;
  const trip_id = c.req.param('id');
  if (!(await repo.trips.get(trip_id))) throw notFound('trip', trip_id);
  const input = c.req.valid('json');
  const order_index =
    input.order_index ??
    (await repo.pins.listByTrip(trip_id)).filter((p) => p.day_index === input.day_index).length;
  const pin = await repo.pins.create({ ...input, order_index, trip_id });
  return c.json(pin, 201);
});

pinsRoutes.patch('/pins/:id', validate('json', UpdatePinInput), async (c) => {
  const pin = await c
    .get('container')
    .ports.repo.pins.update(c.req.param('id'), c.req.valid('json'));
  return c.json(pin);
});

pinsRoutes.delete('/pins/:id', async (c) => {
  await c.get('container').ports.repo.pins.delete(c.req.param('id'));
  return c.body(null, 204);
});

pinsRoutes.put('/trips/:id/pins/order', validate('json', ReorderPinsInput), async (c) => {
  const body: PinsResponse = {
    pins: await c
      .get('container')
      .ports.repo.pins.reorder(c.req.param('id'), c.req.valid('json').order),
  };
  return c.json(body);
});

import { Hono } from 'hono';
import { plan, replan } from '@pinlog/ai';
import { PlanRequest, ReplanRequest } from '@pinlog/schema';
import { notFound } from '../errors';
import { requestSignal, sse } from '../lib/sse';
import { validate } from '../lib/validate';
import type { AppEnv } from '../types';

/** Owner C. POST /trips/:id/plan (SSE PlanEvent) and POST /trips/:id/replan. */
export const planRoutes = new Hono<AppEnv>();

planRoutes.post('/trips/:id/plan', validate('json', PlanRequest), async (c) => {
  const { ports } = c.get('container');
  const trip = await ports.repo.trips.get(c.req.param('id'));
  if (!trip) throw notFound('trip', c.req.param('id'));
  return sse(c, plan(ports, trip, c.req.valid('json'), requestSignal(c)));
});

planRoutes.post('/trips/:id/replan', validate('json', ReplanRequest), async (c) => {
  const { ports } = c.get('container');
  const trip = await ports.repo.trips.get(c.req.param('id'));
  if (!trip) throw notFound('trip', c.req.param('id'));
  return c.json(await replan(ports, trip, c.req.valid('json')));
});

import { Hono } from 'hono';
import { chat, summarize } from '@pinlog/ai';
import { ChatRequest, SummaryRequest, type MessagesResponse } from '@pinlog/schema';
import { notFound } from '../errors';
import { requestSignal, sse } from '../lib/sse';
import { validate } from '../lib/validate';
import type { AppEnv } from '../types';

/** Owner C. POST /trips/:id/chat (SSE), GET /trips/:id/messages, POST /trips/:id/summary. */
export const journalRoutes = new Hono<AppEnv>();

journalRoutes.post('/trips/:id/chat', validate('json', ChatRequest), async (c) => {
  const { ports } = c.get('container');
  const trip_id = c.req.param('id');
  if (!(await ports.repo.trips.get(trip_id))) throw notFound('trip', trip_id);
  const now = c.req.query('now') ?? undefined;
  return sse(c, chat(ports, trip_id, c.req.valid('json'), { now, signal: requestSignal(c) }));
});

journalRoutes.get('/trips/:id/messages', async (c) => {
  const { ports } = c.get('container');
  const trip_id = c.req.param('id');
  if (!(await ports.repo.trips.get(trip_id))) throw notFound('trip', trip_id);
  const body: MessagesResponse = { messages: await ports.repo.messages.listByTrip(trip_id) };
  return c.json(body);
});

journalRoutes.post('/trips/:id/summary', validate('json', SummaryRequest), async (c) => {
  const { ports } = c.get('container');
  const trip_id = c.req.param('id');
  if (!(await ports.repo.trips.get(trip_id))) throw notFound('trip', trip_id);
  const now = c.req.query('now') ?? undefined;
  return c.json(await summarize(ports, trip_id, c.req.valid('json'), { now }));
});

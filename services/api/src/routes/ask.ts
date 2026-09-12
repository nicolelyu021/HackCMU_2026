import { Hono } from 'hono';
import { ask } from '@pinlog/ai';
import { AskRequest, type MessagesResponse } from '@pinlog/schema';
import { notFound } from '../errors';
import { requestSignal, sse } from '../lib/sse';
import { validate } from '../lib/validate';
import type { AppEnv } from '../types';

/** Owner C. POST /pins/:id/ask (SSE AskEvent), GET /pins/:id/messages. */
export const askRoutes = new Hono<AppEnv>();

askRoutes.post('/pins/:id/ask', validate('json', AskRequest), async (c) => {
  const { ports } = c.get('container');
  const pin_id = c.req.param('id');
  if (!(await ports.repo.pins.get(pin_id))) throw notFound('pin', pin_id);
  const now = c.req.query('now') ?? undefined; // trip-local override for rehearsals
  return sse(c, ask(ports, pin_id, c.req.valid('json'), { now, signal: requestSignal(c) }));
});

askRoutes.get('/pins/:id/messages', async (c) => {
  const { ports } = c.get('container');
  const pin_id = c.req.param('id');
  if (!(await ports.repo.pins.get(pin_id))) throw notFound('pin', pin_id);
  const body: MessagesResponse = { messages: await ports.repo.messages.listByPin(pin_id) };
  return c.json(body);
});

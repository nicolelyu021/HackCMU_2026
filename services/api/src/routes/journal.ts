import { Hono } from 'hono';
import type { AppEnv } from '../types';

/** Owner C. POST /trips/:id/chat (SSE), GET /trips/:id/messages, POST /trips/:id/summary. See docs/CONTRACTS.md for bodies, responses and status codes. */
export const journalRoutes = new Hono<AppEnv>();

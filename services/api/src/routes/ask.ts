import { Hono } from 'hono';
import type { AppEnv } from '../types';

/** Owner C. POST /pins/:id/ask (SSE AskEvent), GET /pins/:id/messages. See docs/CONTRACTS.md for bodies, responses and status codes. */
export const askRoutes = new Hono<AppEnv>();

import { Hono } from 'hono';
import type { AppEnv } from '../types';

/** Owner B. Journal entries: POST /pins/:id/entries, POST /trips/:id/entries, DELETE /entries/:id. See docs/CONTRACTS.md for bodies, responses and status codes. */
export const entriesRoutes = new Hono<AppEnv>();

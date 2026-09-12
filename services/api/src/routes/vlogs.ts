import { Hono } from 'hono';
import type { AppEnv } from '../types';

/** Owner D. POST /trips/:id/vlog (202 + in-process job), GET /vlogs/:id, GET /trips/:id/vlogs, POST /vlogs/:id/regenerate, PUT /vlogs/:id/script, POST /vlogs/:id/render. See docs/CONTRACTS.md for bodies, responses and status codes. */
export const vlogsRoutes = new Hono<AppEnv>();

import { Hono } from 'hono';
import type { AppEnv } from '../types';

/** Owner B. POST /trips/:id/media multipart (files[] + meta JSON) → ingestPhoto; PATCH/DELETE /media/:id. See docs/CONTRACTS.md for bodies, responses and status codes. */
export const mediaRoutes = new Hono<AppEnv>();

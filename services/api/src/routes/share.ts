import { Hono } from 'hono';
import type { AppEnv } from '../types';

/** Owner B. Stretch: POST /trips/:id/share, GET /share/:slug (media stripped of lat/lng/exif). See docs/CONTRACTS.md for bodies, responses and status codes. */
export const shareRoutes = new Hono<AppEnv>();

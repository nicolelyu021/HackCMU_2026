import { Hono } from 'hono';
import type { AppEnv } from '../types';

/** Owner B. Pins create/update/delete + PUT /trips/:id/pins/order. See docs/CONTRACTS.md for bodies, responses and status codes. */
export const pinsRoutes = new Hono<AppEnv>();

import { Hono } from 'hono';
import type { AppEnv } from '../types';

/** Owner B. Trips CRUD + GET /trips/:id bundle + DELETE cascade (files via storage.deletePrefix). See docs/CONTRACTS.md for bodies, responses and status codes. */
export const tripsRoutes = new Hono<AppEnv>();

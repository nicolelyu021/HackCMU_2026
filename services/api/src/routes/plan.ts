import { Hono } from 'hono';
import type { AppEnv } from '../types';

/** Owner C. POST /trips/:id/plan (SSE PlanEvent) and POST /trips/:id/replan. See docs/CONTRACTS.md for bodies, responses and status codes. */
export const planRoutes = new Hono<AppEnv>();

import { Hono } from 'hono';
import type { Health } from '@pinlog/schema';
import type { AppEnv } from '../types';

/** Owner B. GET /health — reports the effective adapters so the web can show a "Demo mode" badge. */
export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get('/health', (c) => {
  const k = c.get('container');
  const body: Health = {
    ok: true,
    mode: k.mode,
    providers: k.providers,
    version: k.version,
    files_base_url: k.files_base_url,
    map_style_url: k.map_style_url,
  };
  return c.json(body);
});

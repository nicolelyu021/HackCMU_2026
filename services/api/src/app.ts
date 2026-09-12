import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { LockedPinError, NotFoundError } from '@pinlog/schema';
import type { Container } from './container';
import { ApiError, errorBody } from './errors';
import { askRoutes } from './routes/ask';
import { entriesRoutes } from './routes/entries';
import { filesRoutes } from './routes/files';
import { healthRoutes } from './routes/health';
import { journalRoutes } from './routes/journal';
import { mediaRoutes } from './routes/media';
import { pinsRoutes } from './routes/pins';
import { planRoutes } from './routes/plan';
import { shareRoutes } from './routes/share';
import { tripsRoutes } from './routes/trips';
import { vlogsRoutes } from './routes/vlogs';
import type { AppEnv } from './types';

export interface AppOptions {
  /** Disable request logging (tests). */
  quiet?: boolean;
}

/** The Hono app. Route files are owned per module (see .github/CODEOWNERS); this file only mounts them. */
export function createApp(container: Container, opts: AppOptions = {}): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  if (!opts.quiet) app.use('*', logger());
  app.use(
    '*',
    cors({
      // the web app on this laptop, plus a phone on the same Wi-Fi opening http://<laptop-lan-ip>:3000 (mobile-first demo)
      origin: (origin) =>
        origin === container.env.PINLOG_WEB_ORIGIN ||
        /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[?[0-9a-f:]+\]?)(:\d+)?$/i.test(
          origin,
        )
          ? origin
          : null,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['content-type', 'accept'],
      exposeHeaders: ['content-length', 'content-type'],
      maxAge: 600,
    }),
  );
  app.use('*', async (c, next) => {
    c.set('container', container);
    await next();
  });

  // B · platform
  app.route('/', healthRoutes);
  app.route('/', filesRoutes);
  app.route('/', tripsRoutes);
  app.route('/', pinsRoutes);
  app.route('/', entriesRoutes);
  app.route('/', mediaRoutes);
  app.route('/', shareRoutes);
  // C · ai
  app.route('/', planRoutes);
  app.route('/', askRoutes);
  app.route('/', journalRoutes);
  // D · video
  app.route('/', vlogsRoutes);

  app.notFound((c) =>
    c.json(errorBody('not_found', `No route for ${c.req.method} ${c.req.path}`), 404),
  );
  app.onError((err, c) => {
    if (err instanceof ApiError)
      return c.json(errorBody(err.code, err.message, err.details), err.status);
    if (err instanceof NotFoundError) return c.json(errorBody('not_found', err.message), 404);
    if (err instanceof LockedPinError) return c.json(errorBody('locked_pin', err.message), 400);
    if (err instanceof HTTPException) {
      const status = err.status;
      return c.json(errorBody(status === 404 ? 'not_found' : 'internal', err.message), status);
    }
    console.error('[api] unhandled', err);
    return c.json(
      errorBody('internal', err instanceof Error ? err.message : 'Internal error'),
      500,
    );
  });

  return app;
}

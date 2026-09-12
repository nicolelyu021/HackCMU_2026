import type { Container } from './container';

/** Hono generic: every route reads the container with c.get('container'). */
export type AppEnv = { Variables: { container: Container } };

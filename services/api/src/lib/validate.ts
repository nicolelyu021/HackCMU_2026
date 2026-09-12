import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodType } from 'zod';
import { errorBody } from '../errors';

/** zValidator with the shared error envelope. Usage: routes.post('/x', validate('json', Schema), (c) => c.req.valid('json')). */
export function validate<Target extends keyof ValidationTargets, T extends ZodType>(
  target: Target,
  schema: T,
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(errorBody('validation', 'Invalid request', result.error.issues), 400);
    }
  });
}

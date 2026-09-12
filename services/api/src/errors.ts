import type { ErrorCode, ErrorResponse } from '@pinlog/schema';

/** Throw from anywhere in a route; app.ts turns it into the error envelope. */
export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: 400 | 404 | 409 | 502 | 500 = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const notFound = (what: string, id?: string) =>
  new ApiError('not_found', id ? `${what} ${id} not found` : `${what} not found`, 404);
export const conflict = (message: string) => new ApiError('conflict', message, 409);
export const lockedPin = (pin_id: string) =>
  new ApiError('locked_pin', `Pin ${pin_id} was created by the user and cannot be changed by replan`, 400);
export const providerError = (provider: string, err: unknown) =>
  new ApiError('provider_error', `${provider}: ${err instanceof Error ? err.message : String(err)}`, 502);
export const validation = (message: string, details?: unknown) =>
  new ApiError('validation', message, 400, details);

export function errorBody(code: ErrorCode, message: string, details?: unknown): ErrorResponse {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

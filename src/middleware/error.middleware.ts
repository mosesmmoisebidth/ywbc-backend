import type { ErrorHandler, NotFoundHandler } from 'hono';
import { ApiError } from '../lib/apiError.js';
import { logger } from '../lib/logger.js';
import { fail } from '../utils/response.js';
import type { AppEnv } from '../types/hono.js';

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof ApiError) {
    return c.json(fail(err.message, err.errors, err.code), err.status as 400 | 401 | 403 | 404 | 409);
  }

  logger.error(
    { err: { message: err.message, stack: err.stack }, path: c.req.path, method: c.req.method },
    'Unhandled request error',
  );

  return c.json(fail('Something went gently wrong. Please try again.'), 500);
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) =>
  c.json(fail("That path doesn't exist here."), 404);

import { createMiddleware } from 'hono/factory';
import { ApiError } from '../lib/apiError.js';
import type { AppEnv } from '../types/hono.js';

export const adminMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get('user');
  if (!user) throw ApiError.unauthorized('Please sign in to continue.');
  if (user.role !== 'ADMIN') throw ApiError.forbidden('This action requires admin access.');
  await next();
});

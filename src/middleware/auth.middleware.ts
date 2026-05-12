import { createMiddleware } from 'hono/factory';
import { verifyToken } from '../lib/jwt.js';
import { ApiError } from '../lib/apiError.js';
import type { AppEnv } from '../types/hono.js';

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization') ?? c.req.header('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Please sign in to continue.');
  }
  const token = authHeader.slice(7).trim();
  if (!token) throw ApiError.unauthorized('Please sign in to continue.');

  try {
    const payload = verifyToken(token);
    c.set('user', { id: payload.userId, role: payload.role });
  } catch {
    throw ApiError.unauthorized('Your session has ended. Please sign in again.');
  }

  await next();
});

export const optionalAuthMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization') ?? c.req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(authHeader.slice(7).trim());
      c.set('user', { id: payload.userId, role: payload.role });
    } catch {
      // ignore — optional auth
    }
  }
  await next();
});

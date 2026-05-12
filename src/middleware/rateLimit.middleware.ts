import { rateLimiter } from 'hono-rate-limiter';
import { env } from '../env.js';

const ipFromContext = (c: { req: { header: (n: string) => string | undefined; raw: { headers: Headers } } }): string => {
  const fwd = c.req.header('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  const real = c.req.header('x-real-ip');
  if (real) return real;
  return 'unknown';
};

const skipInTests = () => env.NODE_ENV === 'test';

export const authLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  keyGenerator: ipFromContext,
  skip: skipInTests,
  message: { message: 'Too many attempts. Please try again in a minute.' },
});

export const forgotPasswordLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  keyGenerator: ipFromContext,
  skip: skipInTests,
  message: { message: 'A few reset attempts have been made. Please wait an hour.' },
});

export const uploadLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  keyGenerator: (c) => {
    const user = (c as unknown as { get: (k: string) => unknown }).get('user') as
      | { id: string }
      | undefined;
    return user?.id ?? ipFromContext(c);
  },
  skip: skipInTests,
  message: { message: 'You are uploading quickly. Please slow down for a moment.' },
});

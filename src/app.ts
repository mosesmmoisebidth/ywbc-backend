import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { randomUUID } from 'node:crypto';

import { env } from './env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import type { AppEnv } from './types/hono.js';
import { ok } from './utils/response.js';
import { mountRoutes } from './routes/index.js';

export const app = new Hono<AppEnv>();

app.use('*', secureHeaders());

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      const allowed = env.CORS_ORIGIN.split(',').map((s) => s.trim());
      return allowed.includes(origin) || env.NODE_ENV !== 'production' ? origin : undefined;
    },
    credentials: true,
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);

app.use('*', async (c, next) => {
  const requestId = c.req.header('x-request-id') ?? randomUUID();
  c.set('requestId', requestId);
  c.header('x-request-id', requestId);

  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  const user = c.get('user');
  logger.info(
    {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
      ...(user ? { userId: user.id } : {}),
    },
    'request',
  );
});

app.get('/', (c) => c.json(ok({ name: 'ywbc-backend', status: 'ok' }, 'YWBC Backend running')));
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

mountRoutes(app);

app.notFound(notFoundHandler);
app.onError(errorHandler);

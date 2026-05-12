import { Hono } from 'hono';
import type { AppEnv } from '../types/hono.js';
import { ok } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createMoodSchema, type CreateMoodInput } from '../validators/mood.validator.js';
import * as svc from '../services/mood.service.js';

export const moodRoutes = new Hono<AppEnv>();
moodRoutes.use('*', authMiddleware);

moodRoutes.post('/', validateBody(createMoodSchema), async (c) => {
  const user = c.get('user')!;
  const input = c.get('validated') as CreateMoodInput;
  const data = await svc.create(user.id, input);
  return c.json(ok(data, 'Thank you for checking in.'), 201);
});

moodRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const data = await svc.listRecent(user.id);
  return c.json(ok(data));
});

moodRoutes.get('/stats', async (c) => {
  const user = c.get('user')!;
  const range = c.req.query('range');
  const days = range?.endsWith('d') ? Math.max(1, Math.min(365, parseInt(range, 10))) : 30;
  const data = await svc.stats(user.id, days);
  return c.json(ok(data));
});

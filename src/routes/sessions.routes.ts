import { Hono } from 'hono';
import type { AppEnv } from '../types/hono.js';
import { ok } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  registerSessionSchema,
  type RegisterSessionInput,
} from '../validators/session.validator.js';
import * as svc from '../services/sessions.service.js';
import * as regSvc from '../services/registrations.service.js';

export const sessionsRoutes = new Hono<AppEnv>();

sessionsRoutes.get('/', async (c) => {
  const status = c.req.query('status');
  const data = await svc.list(status === 'upcoming' || status === 'past' ? status : undefined);
  return c.json(ok(data));
});

sessionsRoutes.get('/my-registrations', authMiddleware, async (c) => {
  const user = c.get('user')!;
  const data = await regSvc.listForUser(user.id);
  return c.json(ok(data));
});

sessionsRoutes.get('/:id', async (c) => {
  const data = await svc.getById(c.req.param('id'));
  return c.json(ok(data));
});

sessionsRoutes.post(
  '/:id/register',
  authMiddleware,
  validateBody(registerSessionSchema),
  async (c) => {
    const user = c.get('user')!;
    const input = c.get('validated') as RegisterSessionInput;
    const data = await regSvc.register(user.id, c.req.param('id'), input);
    return c.json(ok(data, "You're registered. We'll send a gentle reminder."), 201);
  },
);

sessionsRoutes.delete('/:id/register', authMiddleware, async (c) => {
  const user = c.get('user')!;
  const data = await regSvc.unregister(user.id, c.req.param('id'));
  return c.json(ok(data, 'Your registration has been removed.'));
});

import { Hono } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import { ok } from '../../utils/response.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import {
  sessionCreateSchema,
  sessionUpdateSchema,
  broadcastSchema,
  cancelSessionSchema,
  type SessionCreateInput,
  type BroadcastInput,
} from '../../validators/admin.validator.js';
import * as svc from '../../services/admin/sessions.service.js';

export const adminSessionsRoutes = new Hono<AppEnv>();

adminSessionsRoutes.get('/', async (c) => c.json(ok(await svc.listAll())));

adminSessionsRoutes.post('/', validateBody(sessionCreateSchema), async (c) => {
  const input = c.get('validated') as SessionCreateInput;
  const data = await svc.create(input);
  return c.json(ok(data, 'Conversation created.'), 201);
});

adminSessionsRoutes.get('/:id', async (c) => c.json(ok(await svc.getById(c.req.param('id')))));

adminSessionsRoutes.patch('/:id', validateBody(sessionUpdateSchema), async (c) => {
  const input = c.get('validated') as Partial<SessionCreateInput>;
  const data = await svc.update(c.req.param('id'), input);
  return c.json(ok(data, 'Conversation updated.'));
});

adminSessionsRoutes.delete('/:id', async (c) => {
  const data = await svc.remove(c.req.param('id'));
  return c.json(ok(data, 'Conversation cancelled.'));
});

adminSessionsRoutes.get('/:id/registrations', async (c) =>
  c.json(ok(await svc.listRegistrations(c.req.param('id')))),
);

adminSessionsRoutes.post('/:id/broadcast', validateBody(broadcastSchema), async (c) => {
  const input = c.get('validated') as BroadcastInput;
  const data = await svc.broadcast(c.req.param('id'), input);
  return c.json(ok(data, 'Message sent.'), 201);
});

adminSessionsRoutes.post('/:id/cancel', validateBody(cancelSessionSchema), async (c) => {
  const input = c.get('validated') as { reason: string };
  const data = await svc.cancel(c.req.param('id'), input.reason);
  return c.json(ok(data, 'Conversation cancelled. Registrants notified.'));
});

export const adminRegistrationsRoutes = new Hono<AppEnv>();
adminRegistrationsRoutes.patch('/:id', async (c) => {
  const body = await c.req.json();
  const attended = Boolean(body.attended);
  const data = await svc.markAttended(c.req.param('id'), attended);
  return c.json(ok(data, 'Attendance updated.'));
});

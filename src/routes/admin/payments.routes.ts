import { Hono } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import { ok } from '../../utils/response.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import {
  approvePaymentSchema,
  rejectPaymentSchema,
} from '../../validators/admin.validator.js';
import { paginationSchema } from '../../utils/pagination.js';
import * as svc from '../../services/admin/payments.service.js';

export const adminPaymentsRoutes = new Hono<AppEnv>();

adminPaymentsRoutes.get('/', async (c) => {
  const params = paginationSchema.parse(c.req.query());
  const status = c.req.query('status');
  const result = await svc.list({ ...params, status });
  return c.json(result);
});

adminPaymentsRoutes.get('/history', async (c) => {
  const params = paginationSchema.parse(c.req.query());
  const status = c.req.query('status') === 'rejected' ? 'rejected' : 'approved';
  const result = await svc.history({ ...params, status });
  return c.json(result);
});

adminPaymentsRoutes.get('/:id', async (c) => c.json(ok(await svc.getById(c.req.param('id')))));

adminPaymentsRoutes.post('/:id/approve', validateBody(approvePaymentSchema), async (c) => {
  const input = c.get('validated') as { note?: string };
  const data = await svc.approve(c.req.param('id'), input.note);
  return c.json(ok(data, 'Approved.'));
});

adminPaymentsRoutes.post('/:id/reject', validateBody(rejectPaymentSchema), async (c) => {
  const input = c.get('validated') as { reason: string };
  const data = await svc.reject(c.req.param('id'), input.reason);
  return c.json(ok(data, 'Declined. The user will be notified.'));
});

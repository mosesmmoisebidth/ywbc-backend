import { Hono } from 'hono';
import type { AppEnv } from '../types/hono.js';
import { ok } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  createBookingSchema,
  submitProofSchema,
  cancelBookingSchema,
  type CreateBookingInput,
  type SubmitProofInput,
  type CancelBookingInput,
} from '../validators/booking.validator.js';
import * as svc from '../services/bookings.service.js';

export const bookingsRoutes = new Hono<AppEnv>();

bookingsRoutes.use('*', authMiddleware);

bookingsRoutes.post('/', validateBody(createBookingSchema), async (c) => {
  const user = c.get('user')!;
  const input = c.get('validated') as CreateBookingInput;
  const result = await svc.create(user.id, input);
  return c.json(ok(result, 'Booking created. Send the payment to confirm.'), 201);
});

bookingsRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const data = await svc.listForUser(user.id);
  return c.json(ok(data));
});

bookingsRoutes.get('/:id', async (c) => {
  const user = c.get('user')!;
  const data = await svc.getOwn(user.id, c.req.param('id'));
  return c.json(ok(data));
});

bookingsRoutes.post('/:id/payment-proof', validateBody(submitProofSchema), async (c) => {
  const user = c.get('user')!;
  const input = c.get('validated') as SubmitProofInput;
  const data = await svc.submitProof(user.id, c.req.param('id'), input);
  return c.json(ok(data, 'Thank you. We will review your payment shortly.'));
});

bookingsRoutes.post('/:id/cancel', validateBody(cancelBookingSchema), async (c) => {
  const user = c.get('user')!;
  const input = c.get('validated') as CancelBookingInput;
  const data = await svc.cancel(user.id, c.req.param('id'), input.reason);
  return c.json(ok(data, 'Your booking has been cancelled.'));
});

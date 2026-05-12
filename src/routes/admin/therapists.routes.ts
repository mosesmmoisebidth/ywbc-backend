import { Hono } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import { ok } from '../../utils/response.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import {
  therapistCreateSchema,
  therapistUpdateSchema,
  therapistAvailabilitySchema,
  type TherapistCreateInput,
  type TherapistUpdateInput,
} from '../../validators/admin.validator.js';
import * as svc from '../../services/admin/therapists.service.js';

export const adminTherapistsRoutes = new Hono<AppEnv>();

adminTherapistsRoutes.get('/', async (c) => c.json(ok(await svc.listAll())));

adminTherapistsRoutes.post('/', validateBody(therapistCreateSchema), async (c) => {
  const input = c.get('validated') as TherapistCreateInput;
  const data = await svc.create(input);
  return c.json(ok(data, 'Therapist added.'), 201);
});

adminTherapistsRoutes.get('/:id', async (c) => c.json(ok(await svc.getById(c.req.param('id')))));

adminTherapistsRoutes.patch('/:id', validateBody(therapistUpdateSchema), async (c) => {
  const input = c.get('validated') as TherapistUpdateInput;
  const data = await svc.update(c.req.param('id'), input);
  return c.json(ok(data, 'Therapist updated.'));
});

adminTherapistsRoutes.delete('/:id', async (c) => {
  const data = await svc.deactivate(c.req.param('id'));
  return c.json(ok(data, 'Therapist deactivated.'));
});

adminTherapistsRoutes.patch('/:id/availability', validateBody(therapistAvailabilitySchema), async (c) => {
  const input = c.get('validated') as { weeklySchedule?: unknown; scheduleExceptions?: unknown };
  const data = await svc.updateAvailability(c.req.param('id'), input);
  return c.json(ok(data, 'Availability updated.'));
});

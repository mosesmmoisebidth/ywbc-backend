import { Hono } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import { ok } from '../../utils/response.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { meditationSchema, meditationUpdateSchema } from '../../validators/admin.validator.js';
import type { ContentStatus, MeditationCategory } from '../../generated/prisma/client.js';
import * as svc from '../../services/admin/meditations.service.js';

type MedInput = {
  title: string;
  description: string;
  audioURL: string;
  duration: number;
  coverImageURL: string;
  category: MeditationCategory;
  status: ContentStatus;
};

export const adminMeditationsRoutes = new Hono<AppEnv>();

adminMeditationsRoutes.get('/', async (c) => c.json(ok(await svc.listAll())));

adminMeditationsRoutes.post('/', validateBody(meditationSchema), async (c) => {
  const data = await svc.create(c.get('validated') as MedInput);
  return c.json(ok(data, 'Meditation added.'), 201);
});

adminMeditationsRoutes.patch('/:id', validateBody(meditationUpdateSchema), async (c) => {
  const data = await svc.update(c.req.param('id'), c.get('validated') as Partial<MedInput>);
  return c.json(ok(data, 'Meditation updated.'));
});

adminMeditationsRoutes.delete('/:id', async (c) => {
  const data = await svc.remove(c.req.param('id'));
  return c.json(ok(data, 'Meditation removed.'));
});

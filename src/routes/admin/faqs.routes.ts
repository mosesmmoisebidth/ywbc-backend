import { Hono } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import { ok } from '../../utils/response.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import {
  faqSchema,
  faqUpdateSchema,
  faqReorderSchema,
} from '../../validators/admin.validator.js';
import type { FAQCategory } from '../../generated/prisma/client.js';
import * as svc from '../../services/admin/faqs.service.js';

type FaqInput = {
  question: string;
  answer: string;
  category: FAQCategory;
  followUpActions?: unknown;
  relatedFaqIds: string[];
  order: number;
  isActive: boolean;
};

export const adminFaqsRoutes = new Hono<AppEnv>();

adminFaqsRoutes.get('/', async (c) => c.json(ok(await svc.listAll())));

adminFaqsRoutes.post('/', validateBody(faqSchema), async (c) => {
  const data = await svc.create(c.get('validated') as FaqInput);
  return c.json(ok(data, 'FAQ added.'), 201);
});

adminFaqsRoutes.patch('/reorder', validateBody(faqReorderSchema), async (c) => {
  const input = c.get('validated') as { ids: string[] };
  const data = await svc.reorder(input.ids);
  return c.json(ok(data, 'Order saved.'));
});

adminFaqsRoutes.patch('/:id', validateBody(faqUpdateSchema), async (c) => {
  const data = await svc.update(c.req.param('id'), c.get('validated') as Partial<FaqInput>);
  return c.json(ok(data, 'FAQ updated.'));
});

adminFaqsRoutes.delete('/:id', async (c) => {
  const data = await svc.remove(c.req.param('id'));
  return c.json(ok(data, 'FAQ removed.'));
});

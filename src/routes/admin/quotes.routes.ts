import { Hono } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import { ok } from '../../utils/response.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { quoteSchema, quoteUpdateSchema } from '../../validators/admin.validator.js';
import type { QuoteCategory } from '../../generated/prisma/client.js';
import * as svc from '../../services/admin/quotes.service.js';

type QuoteInput = {
  text: string;
  author: string;
  category: QuoteCategory;
  isActive: boolean;
  scheduledFor?: string;
};

export const adminQuotesRoutes = new Hono<AppEnv>();

adminQuotesRoutes.get('/', async (c) => c.json(ok(await svc.listAll())));

adminQuotesRoutes.post('/', validateBody(quoteSchema), async (c) => {
  const data = await svc.create(c.get('validated') as QuoteInput);
  return c.json(ok(data, 'Quote added.'), 201);
});

adminQuotesRoutes.patch('/:id', validateBody(quoteUpdateSchema), async (c) => {
  const data = await svc.update(c.req.param('id'), c.get('validated') as Partial<QuoteInput>);
  return c.json(ok(data, 'Quote updated.'));
});

adminQuotesRoutes.delete('/:id', async (c) => {
  const data = await svc.remove(c.req.param('id'));
  return c.json(ok(data, 'Quote removed.'));
});

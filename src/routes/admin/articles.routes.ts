import { Hono } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import { ok } from '../../utils/response.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import {
  articleCreateSchema,
  articleUpdateSchema,
  articleScheduleSchema,
  type ArticleCreateInput,
} from '../../validators/admin.validator.js';
import * as svc from '../../services/admin/articles.service.js';

export const adminArticlesRoutes = new Hono<AppEnv>();

adminArticlesRoutes.get('/', async (c) => c.json(ok(await svc.listAll())));

adminArticlesRoutes.post('/', validateBody(articleCreateSchema), async (c) => {
  const input = c.get('validated') as ArticleCreateInput;
  const data = await svc.create(input);
  return c.json(ok(data, 'Draft saved.'), 201);
});

adminArticlesRoutes.get('/:id', async (c) => c.json(ok(await svc.getById(c.req.param('id')))));

adminArticlesRoutes.patch('/:id', validateBody(articleUpdateSchema), async (c) => {
  const input = c.get('validated') as Partial<ArticleCreateInput>;
  const data = await svc.update(c.req.param('id'), input);
  return c.json(ok(data, 'Saved.'));
});

adminArticlesRoutes.post('/:id/publish', async (c) => {
  const data = await svc.publish(c.req.param('id'));
  return c.json(ok(data, 'Published.'));
});

adminArticlesRoutes.post('/:id/schedule', validateBody(articleScheduleSchema), async (c) => {
  const input = c.get('validated') as { publishAt: string };
  const data = await svc.schedule(c.req.param('id'), input.publishAt);
  return c.json(ok(data, 'Scheduled.'));
});

adminArticlesRoutes.delete('/:id', async (c) => {
  const data = await svc.softDelete(c.req.param('id'));
  return c.json(ok(data, 'Article archived.'));
});

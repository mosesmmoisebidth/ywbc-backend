import { Hono } from 'hono';
import type { AppEnv } from '../types/hono.js';
import { ok } from '../utils/response.js';
import { paginationSchema } from '../utils/pagination.js';
import * as svc from '../services/articles.service.js';

export const articlesRoutes = new Hono<AppEnv>();

articlesRoutes.get('/', async (c) => {
  const params = paginationSchema.parse(c.req.query());
  const category = c.req.query('category');
  const result = await svc.listPublished({ ...params, category });
  return c.json(result);
});

articlesRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const data = await svc.getBySlug(slug);
  return c.json(ok(data));
});

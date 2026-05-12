import { Hono } from 'hono';
import type { AppEnv } from '../types/hono.js';
import { ok } from '../utils/response.js';
import * as svc from '../services/faqs.service.js';
import type { FAQCategory } from '../generated/prisma/client.js';

const FAQ_CATEGORIES: readonly FAQCategory[] = ['GENERAL', 'THERAPY', 'NUTRITION', 'BOOKING'];

const isCategory = (v: unknown): v is FAQCategory =>
  typeof v === 'string' && FAQ_CATEGORIES.includes(v as FAQCategory);

export const faqsRoutes = new Hono<AppEnv>();

faqsRoutes.get('/', async (c) => {
  const cat = c.req.query('category');
  const data = await svc.listActive(isCategory(cat) ? cat : undefined);
  return c.json(ok(data));
});

faqsRoutes.get('/:id', async (c) => {
  const data = await svc.getById(c.req.param('id'));
  return c.json(ok(data));
});

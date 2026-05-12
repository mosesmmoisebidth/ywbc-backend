import { Hono } from 'hono';
import type { AppEnv } from '../types/hono.js';
import { ok } from '../utils/response.js';
import * as svc from '../services/quotes.service.js';
import type { QuoteCategory } from '../generated/prisma/client.js';

const QUOTE_CATEGORIES: readonly QuoteCategory[] = ['WELLNESS', 'NUTRITION', 'MOTIVATION', 'RECONCILIATION'];

const isCategory = (v: unknown): v is QuoteCategory =>
  typeof v === 'string' && QUOTE_CATEGORIES.includes(v as QuoteCategory);

export const quotesRoutes = new Hono<AppEnv>();

quotesRoutes.get('/daily', async (c) => {
  const data = await svc.dailyQuote();
  return c.json(ok(data));
});

quotesRoutes.get('/', async (c) => {
  const cat = c.req.query('category');
  const data = await svc.listActive(isCategory(cat) ? cat : undefined);
  return c.json(ok(data));
});

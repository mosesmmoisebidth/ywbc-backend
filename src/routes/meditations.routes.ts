import { Hono } from 'hono';
import type { AppEnv } from '../types/hono.js';
import { ok } from '../utils/response.js';
import * as svc from '../services/meditations.service.js';
import type { MeditationCategory } from '../generated/prisma/client.js';

const MED_CATEGORIES: readonly MeditationCategory[] = ['SLEEP', 'ANXIETY', 'FOCUS', 'BREATHING', 'BODY_SCAN'];

const isCategory = (v: unknown): v is MeditationCategory =>
  typeof v === 'string' && MED_CATEGORIES.includes(v as MeditationCategory);

export const meditationsRoutes = new Hono<AppEnv>();

meditationsRoutes.get('/', async (c) => {
  const cat = c.req.query('category');
  const data = await svc.listPublished(isCategory(cat) ? cat : undefined);
  return c.json(ok(data));
});

meditationsRoutes.get('/:id', async (c) => {
  const data = await svc.getById(c.req.param('id'));
  return c.json(ok(data));
});

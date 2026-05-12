import { Hono } from 'hono';
import type { AppEnv } from '../types/hono.js';
import { ok } from '../utils/response.js';
import * as svc from '../services/psychologists.service.js';

export const psychologistsRoutes = new Hono<AppEnv>();

psychologistsRoutes.get('/', async (c) => {
  const data = await svc.listActive();
  return c.json(ok(data));
});

psychologistsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const data = await svc.getById(id);
  return c.json(ok(data));
});

psychologistsRoutes.get('/:id/slots', async (c) => {
  const id = c.req.param('id');
  const date = c.req.query('date');
  if (!date) {
    return c.json({ message: 'Please include a date (YYYY-MM-DD).' }, 400);
  }
  const data = await svc.availableSlots(id, date);
  return c.json(ok(data));
});

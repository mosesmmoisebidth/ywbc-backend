import { Hono } from 'hono';
import type { AppEnv } from '../types/hono.js';
import { ok } from '../utils/response.js';
import * as svc from '../services/nutrition.service.js';

export const nutritionRoutes = new Hono<AppEnv>();

nutritionRoutes.get('/tips', async (c) => c.json(ok(await svc.listTips())));
nutritionRoutes.get('/tips/daily', async (c) => c.json(ok(await svc.dailyTip())));
nutritionRoutes.get('/meal-plans', async (c) => c.json(ok(await svc.listMealPlans())));
nutritionRoutes.get('/meal-plans/:id', async (c) =>
  c.json(ok(await svc.getMealPlan(c.req.param('id')))),
);

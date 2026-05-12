import { Hono } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import { ok } from '../../utils/response.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import {
  nutritionTipSchema,
  nutritionTipUpdateSchema,
  mealPlanSchema,
  mealPlanUpdateSchema,
} from '../../validators/admin.validator.js';
import type { ContentStatus } from '../../generated/prisma/client.js';
import * as svc from '../../services/admin/nutrition.service.js';

type TipInput = {
  title: string;
  description: string;
  icon: string;
  category: string;
  isActive: boolean;
};

type MealPlanInput = {
  title: string;
  coverImageURL: string;
  goal: string;
  durationDays: number;
  status: ContentStatus;
  days: {
    dayNumber: number;
    meals: {
      slot: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
      title: string;
      photoURL?: string;
      ingredients: string[];
      instructions?: string;
    }[];
  }[];
};

export const adminNutritionRoutes = new Hono<AppEnv>();

// Tips
adminNutritionRoutes.get('/tips', async (c) => c.json(ok(await svc.listTips())));
adminNutritionRoutes.post('/tips', validateBody(nutritionTipSchema), async (c) => {
  const data = await svc.createTip(c.get('validated') as TipInput);
  return c.json(ok(data, 'Tip added.'), 201);
});
adminNutritionRoutes.patch('/tips/:id', validateBody(nutritionTipUpdateSchema), async (c) => {
  const data = await svc.updateTip(c.req.param('id'), c.get('validated') as Partial<TipInput>);
  return c.json(ok(data, 'Tip updated.'));
});
adminNutritionRoutes.delete('/tips/:id', async (c) => {
  const data = await svc.removeTip(c.req.param('id'));
  return c.json(ok(data, 'Tip removed.'));
});

// Meal plans
adminNutritionRoutes.get('/meal-plans', async (c) => c.json(ok(await svc.listPlans())));
adminNutritionRoutes.post('/meal-plans', validateBody(mealPlanSchema), async (c) => {
  const data = await svc.createPlan(c.get('validated') as MealPlanInput);
  return c.json(ok(data, 'Meal plan created.'), 201);
});
adminNutritionRoutes.get('/meal-plans/:id', async (c) =>
  c.json(ok(await svc.getPlanById(c.req.param('id')))),
);
adminNutritionRoutes.patch('/meal-plans/:id', validateBody(mealPlanUpdateSchema), async (c) => {
  const data = await svc.updatePlan(c.req.param('id'), c.get('validated') as Partial<MealPlanInput>);
  return c.json(ok(data, 'Meal plan updated.'));
});
adminNutritionRoutes.delete('/meal-plans/:id', async (c) => {
  const data = await svc.removePlan(c.req.param('id'));
  return c.json(ok(data, 'Meal plan removed.'));
});

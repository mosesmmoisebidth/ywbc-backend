import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/apiError.js';

export async function listTips() {
  return prisma.nutritionTip.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
}

export async function dailyTip() {
  const total = await prisma.nutritionTip.count({ where: { isActive: true } });
  if (total === 0) return null;
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const skip = dayOfYear % total;
  const [tip] = await prisma.nutritionTip.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    skip,
    take: 1,
  });
  return tip ?? null;
}

export async function listMealPlans() {
  return prisma.mealPlan.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMealPlan(id: string) {
  const plan = await prisma.mealPlan.findUnique({
    where: { id },
    include: { days: { orderBy: { dayNumber: 'asc' } } },
  });
  if (!plan || plan.status !== 'PUBLISHED') {
    throw ApiError.notFound("We couldn't find that meal plan.");
  }
  return plan;
}

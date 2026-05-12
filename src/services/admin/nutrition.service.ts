import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import type { ContentStatus, Prisma } from '../../generated/prisma/client.js';

interface TipInput {
  title: string;
  description: string;
  icon: string;
  category: string;
  isActive: boolean;
}

interface MealEntry {
  slot: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  title: string;
  photoURL?: string;
  ingredients: string[];
  instructions?: string;
}

interface MealPlanInput {
  title: string;
  coverImageURL: string;
  goal: string;
  durationDays: number;
  status: ContentStatus;
  days: { dayNumber: number; meals: MealEntry[] }[];
}

// ─── Tips ───
export const listTips = () =>
  prisma.nutritionTip.findMany({ orderBy: { createdAt: 'desc' } });

const getTip = async (id: string) => {
  const tip = await prisma.nutritionTip.findUnique({ where: { id } });
  if (!tip) throw ApiError.notFound("We couldn't find that tip.");
  return tip;
};

export const createTip = (input: TipInput) => prisma.nutritionTip.create({ data: input });

export const updateTip = async (id: string, input: Partial<TipInput>) => {
  await getTip(id);
  return prisma.nutritionTip.update({ where: { id }, data: input });
};

export const removeTip = async (id: string) => {
  await getTip(id);
  await prisma.nutritionTip.delete({ where: { id } });
  return { ok: true };
};

// ─── Meal Plans ───
export const listPlans = () =>
  prisma.mealPlan.findMany({
    orderBy: { createdAt: 'desc' },
    include: { days: { orderBy: { dayNumber: 'asc' } } },
  });

const getPlan = async (id: string) => {
  const plan = await prisma.mealPlan.findUnique({
    where: { id },
    include: { days: { orderBy: { dayNumber: 'asc' } } },
  });
  if (!plan) throw ApiError.notFound("We couldn't find that meal plan.");
  return plan;
};

export const getPlanById = getPlan;

export const createPlan = (input: MealPlanInput) =>
  prisma.mealPlan.create({
    data: {
      title: input.title,
      coverImageURL: input.coverImageURL,
      goal: input.goal,
      durationDays: input.durationDays,
      status: input.status,
      days: {
        create: input.days.map((d) => ({
          dayNumber: d.dayNumber,
          meals: d.meals as unknown as Prisma.InputJsonValue,
        })),
      },
    },
    include: { days: { orderBy: { dayNumber: 'asc' } } },
  });

export const updatePlan = async (id: string, input: Partial<MealPlanInput>) => {
  await getPlan(id);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.mealPlan.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.coverImageURL !== undefined ? { coverImageURL: input.coverImageURL } : {}),
        ...(input.goal !== undefined ? { goal: input.goal } : {}),
        ...(input.durationDays !== undefined ? { durationDays: input.durationDays } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    if (input.days) {
      await tx.mealPlanDay.deleteMany({ where: { mealPlanId: id } });
      for (const d of input.days) {
        await tx.mealPlanDay.create({
          data: {
            mealPlanId: id,
            dayNumber: d.dayNumber,
            meals: d.meals as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }
    return updated;
  });
};

export const removePlan = async (id: string) => {
  await getPlan(id);
  await prisma.mealPlan.delete({ where: { id } });
  return { ok: true };
};

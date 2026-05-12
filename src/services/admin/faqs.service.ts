import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { FAQCategory } from '../../generated/prisma/client.js';

interface FaqInput {
  question: string;
  answer: string;
  category: FAQCategory;
  followUpActions?: unknown;
  relatedFaqIds: string[];
  order: number;
  isActive: boolean;
}

export const listAll = () =>
  prisma.fAQ.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }] });

const getOr404 = async (id: string) => {
  const faq = await prisma.fAQ.findUnique({ where: { id } });
  if (!faq) throw ApiError.notFound("We couldn't find that FAQ.");
  return faq;
};

export const create = (input: FaqInput) =>
  prisma.fAQ.create({
    data: {
      question: input.question,
      answer: input.answer,
      category: input.category,
      followUpActions: (input.followUpActions ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      relatedFaqIds: input.relatedFaqIds,
      order: input.order,
      isActive: input.isActive,
    },
  });

export const update = async (id: string, input: Partial<FaqInput>) => {
  await getOr404(id);
  const data: Prisma.FAQUpdateInput = {
    ...(input.question !== undefined ? { question: input.question } : {}),
    ...(input.answer !== undefined ? { answer: input.answer } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.relatedFaqIds !== undefined ? { relatedFaqIds: input.relatedFaqIds } : {}),
    ...(input.order !== undefined ? { order: input.order } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  };
  if (input.followUpActions !== undefined) {
    data.followUpActions = input.followUpActions as Prisma.InputJsonValue;
  }
  return prisma.fAQ.update({ where: { id }, data });
};

export const remove = async (id: string) => {
  await getOr404(id);
  await prisma.fAQ.delete({ where: { id } });
  return { ok: true };
};

export const reorder = async (ids: string[]) => {
  await prisma.$transaction(
    ids.map((id, index) => prisma.fAQ.update({ where: { id }, data: { order: index } })),
  );
  return { ok: true };
};

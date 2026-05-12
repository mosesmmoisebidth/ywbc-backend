import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import type { QuoteCategory } from '../../generated/prisma/client.js';

interface QuoteUpsert {
  text: string;
  author: string;
  category: QuoteCategory;
  isActive: boolean;
  scheduledFor?: string;
}

export const listAll = () => prisma.dailyQuote.findMany({ orderBy: { createdAt: 'desc' } });

const getOr404 = async (id: string) => {
  const q = await prisma.dailyQuote.findUnique({ where: { id } });
  if (!q) throw ApiError.notFound("We couldn't find that quote.");
  return q;
};

export const create = (input: QuoteUpsert) =>
  prisma.dailyQuote.create({
    data: {
      ...input,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
    },
  });

export const update = async (id: string, input: Partial<QuoteUpsert>) => {
  await getOr404(id);
  return prisma.dailyQuote.update({
    where: { id },
    data: {
      ...input,
      ...(input.scheduledFor ? { scheduledFor: new Date(input.scheduledFor) } : {}),
    },
  });
};

export const remove = async (id: string) => {
  await getOr404(id);
  await prisma.dailyQuote.delete({ where: { id } });
  return { ok: true };
};

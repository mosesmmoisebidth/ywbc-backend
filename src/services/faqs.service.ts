import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/apiError.js';
import type { FAQCategory } from '../generated/prisma/client.js';

export async function listActive(category?: FAQCategory) {
  return prisma.fAQ.findMany({
    where: { isActive: true, ...(category ? { category } : {}) },
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  });
}

export async function getById(id: string) {
  const faq = await prisma.fAQ.findUnique({ where: { id } });
  if (!faq || !faq.isActive) throw ApiError.notFound("We couldn't find that question.");
  return faq;
}

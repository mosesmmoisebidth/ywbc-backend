import { prisma } from '../lib/prisma.js';
import type { QuoteCategory } from '../generated/prisma/client.js';

export async function listActive(category?: QuoteCategory) {
  return prisma.dailyQuote.findMany({
    where: { isActive: true, ...(category ? { category } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}

export async function dailyQuote() {
  const total = await prisma.dailyQuote.count({ where: { isActive: true } });
  if (total === 0) return null;

  // Deterministic-by-day rotation.
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const skip = dayOfYear % total;

  const [quote] = await prisma.dailyQuote.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    skip,
    take: 1,
  });
  return quote ?? null;
}

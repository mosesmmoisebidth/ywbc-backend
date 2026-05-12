import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/apiError.js';
import type { MeditationCategory } from '../generated/prisma/client.js';

export async function listPublished(category?: MeditationCategory) {
  return prisma.meditation.findMany({
    where: { status: 'PUBLISHED', ...(category ? { category } : {}) },
    orderBy: { publishedAt: 'desc' },
  });
}

export async function getById(id: string) {
  const m = await prisma.meditation.findUnique({ where: { id } });
  if (!m || m.status !== 'PUBLISHED') throw ApiError.notFound("We couldn't find that meditation.");
  return m;
}

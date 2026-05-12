import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import type { ContentStatus, MeditationCategory } from '../../generated/prisma/client.js';

interface MeditationInput {
  title: string;
  description: string;
  audioURL: string;
  duration: number;
  coverImageURL: string;
  /** Narrator name shown to listeners. Optional. */
  narrator?: string;
  /** Full transcript for accessibility + search. Optional. */
  transcript?: string;
  category: MeditationCategory;
  status: ContentStatus;
}

export const listAll = () => prisma.meditation.findMany({ orderBy: { createdAt: 'desc' } });

const getOr404 = async (id: string) => {
  const m = await prisma.meditation.findUnique({ where: { id } });
  if (!m) throw ApiError.notFound("We couldn't find that meditation.");
  return m;
};

export const create = (input: MeditationInput) =>
  prisma.meditation.create({
    data: {
      ...input,
      ...(input.status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
    },
  });

export const update = async (id: string, input: Partial<MeditationInput>) => {
  const existing = await getOr404(id);
  const goingLive = input.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';
  return prisma.meditation.update({
    where: { id },
    data: {
      ...input,
      ...(goingLive ? { publishedAt: new Date() } : {}),
    },
  });
};

export const remove = async (id: string) => {
  await getOr404(id);
  await prisma.meditation.delete({ where: { id } });
  return { ok: true };
};

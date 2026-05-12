import { prisma } from '../lib/prisma.js';
import type { CreateMoodInput } from '../validators/mood.validator.js';

export async function create(userId: string, input: CreateMoodInput) {
  return prisma.moodEntry.create({ data: { userId, ...input } });
}

export async function listRecent(userId: string, limit = 30) {
  return prisma.moodEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function stats(userId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const entries = await prisma.moodEntry.findMany({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: 'asc' },
  });

  if (entries.length === 0) {
    return { count: 0, average: null, byDay: [] };
  }

  const byDay = new Map<string, number[]>();
  for (const e of entries) {
    const day = e.createdAt.toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(e.mood);
  }

  const avg = entries.reduce((s, e) => s + e.mood, 0) / entries.length;

  return {
    count: entries.length,
    average: Math.round(avg * 10) / 10,
    byDay: [...byDay.entries()].map(([day, moods]) => ({
      day,
      average: Math.round((moods.reduce((s, m) => s + m, 0) / moods.length) * 10) / 10,
      count: moods.length,
    })),
  };
}

import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/apiError.js';
import type { ConversationStatus } from '../generated/prisma/client.js';

export async function list(status?: 'upcoming' | 'past' | ConversationStatus) {
  if (status === 'upcoming') {
    return prisma.onlineConversation.findMany({
      where: { status: { in: ['UPCOMING', 'LIVE'] }, dateTime: { gte: new Date() } },
      orderBy: { dateTime: 'asc' },
      include: { _count: { select: { registrations: true } } },
    });
  }
  if (status === 'past') {
    return prisma.onlineConversation.findMany({
      where: { OR: [{ status: 'PAST' }, { dateTime: { lt: new Date() } }] },
      orderBy: { dateTime: 'desc' },
      include: { _count: { select: { registrations: true } } },
    });
  }
  return prisma.onlineConversation.findMany({
    where: status ? { status: status as ConversationStatus } : {},
    orderBy: { dateTime: 'asc' },
    include: { _count: { select: { registrations: true } } },
  });
}

export async function getById(id: string) {
  const session = await prisma.onlineConversation.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });
  if (!session) throw ApiError.notFound("We couldn't find that conversation.");
  return session;
}

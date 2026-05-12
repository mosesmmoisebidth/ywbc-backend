import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/apiError.js';
import type { RegisterSessionInput } from '../validators/session.validator.js';

export async function register(userId: string, conversationId: string, input: RegisterSessionInput) {
  const session = await prisma.onlineConversation.findUnique({
    where: { id: conversationId },
    include: { _count: { select: { registrations: true } } },
  });
  if (!session) throw ApiError.notFound("We couldn't find that conversation.");
  if (session.status === 'CANCELLED' || session.status === 'PAST') {
    throw ApiError.badRequest('Registration is closed for this conversation.');
  }
  if (session._count.registrations >= session.capacity) {
    throw ApiError.conflict('This conversation is full. Watch for the next one.');
  }

  const existing = await prisma.conversationRegistration.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (existing) throw ApiError.conflict("You're already registered for this conversation.");

  return prisma.conversationRegistration.create({
    data: { conversationId, userId, reason: input.reason },
  });
}

export async function unregister(userId: string, conversationId: string) {
  const reg = await prisma.conversationRegistration.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!reg) throw ApiError.notFound("You weren't registered for this conversation.");
  await prisma.conversationRegistration.delete({ where: { id: reg.id } });
  return { ok: true };
}

export async function listForUser(userId: string) {
  return prisma.conversationRegistration.findMany({
    where: { userId },
    include: { conversation: true },
    orderBy: { registeredAt: 'desc' },
  });
}

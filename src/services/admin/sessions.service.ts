import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import type {
  SessionCreateInput,
  BroadcastInput,
} from '../../validators/admin.validator.js';

export async function listAll() {
  return prisma.onlineConversation.findMany({
    orderBy: { dateTime: 'desc' },
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

export async function create(input: SessionCreateInput) {
  return prisma.onlineConversation.create({
    data: {
      ...input,
      dateTime: new Date(input.dateTime),
      ...(input.endsAt ? { endsAt: new Date(input.endsAt) } : {}),
    },
  });
}

export async function update(id: string, input: Partial<SessionCreateInput>) {
  await getById(id);
  return prisma.onlineConversation.update({
    where: { id },
    data: {
      ...input,
      ...(input.dateTime ? { dateTime: new Date(input.dateTime) } : {}),
      ...(input.endsAt ? { endsAt: new Date(input.endsAt) } : {}),
    },
  });
}

export async function remove(id: string) {
  await getById(id);
  return prisma.onlineConversation.update({ where: { id }, data: { status: 'CANCELLED' } });
}

export async function listRegistrations(id: string) {
  await getById(id);
  return prisma.conversationRegistration.findMany({
    where: { conversationId: id },
    include: { user: { select: { id: true, fullName: true, email: true } } },
    orderBy: { registeredAt: 'asc' },
  });
}

export async function markAttended(registrationId: string, attended: boolean) {
  const reg = await prisma.conversationRegistration.findUnique({ where: { id: registrationId } });
  if (!reg) throw ApiError.notFound("We couldn't find that registration.");
  return prisma.conversationRegistration.update({
    where: { id: registrationId },
    data: { attended },
  });
}

export async function broadcast(id: string, input: BroadcastInput) {
  const session = await getById(id);
  return prisma.sessionBroadcast.create({
    data: {
      conversationId: id,
      subject: input.subject,
      body: input.body,
      recipientCount: session._count.registrations,
    },
  });
}

export async function cancel(id: string, reason: string) {
  const session = await getById(id);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.onlineConversation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await tx.sessionBroadcast.create({
      data: {
        conversationId: id,
        subject: 'A change to our upcoming conversation',
        body: reason,
        recipientCount: session._count.registrations,
      },
    });
    return updated;
  });
}

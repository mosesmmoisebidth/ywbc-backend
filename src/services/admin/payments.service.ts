import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { skipTake, type PaginationParams } from '../../utils/pagination.js';
import { buildPagination, paginated } from '../../utils/response.js';
import type { BookingStatus } from '../../generated/prisma/client.js';

const STATUS_FILTERS: Record<string, BookingStatus[]> = {
  pending: ['PAYMENT_SUBMITTED'],
  approved: ['CONFIRMED'],
  rejected: ['REJECTED'],
};

export async function list(params: PaginationParams & { status?: string }) {
  const statuses = STATUS_FILTERS[params.status ?? 'pending'];
  const where = statuses ? { status: { in: statuses } } : {};
  const [data, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      ...skipTake(params),
      orderBy: { paymentSubmittedAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        psychologist: { select: { id: true, fullName: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);
  return paginated(data, buildPagination(params.page, params.perPage, total));
}

export async function history(params: PaginationParams & { status: 'approved' | 'rejected' }) {
  const statuses = params.status === 'approved' ? ['CONFIRMED'] as const : ['REJECTED'] as const;
  const where = { status: { in: statuses as unknown as BookingStatus[] } };
  const [data, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      ...skipTake(params),
      orderBy: { confirmedAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        psychologist: { select: { id: true, fullName: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);
  return paginated(data, buildPagination(params.page, params.perPage, total));
}

export async function getById(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      psychologist: { select: { id: true, fullName: true, title: true } },
    },
  });
  if (!booking) throw ApiError.notFound("We couldn't find that payment.");
  return booking;
}

export async function approve(id: string, note?: string) {
  const booking = await getById(id);
  if (booking.status !== 'PAYMENT_SUBMITTED') {
    throw ApiError.badRequest('Only submitted payments can be approved.');
  }
  return prisma.booking.update({
    where: { id },
    data: {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      adminNotes: note,
    },
  });
}

export async function reject(id: string, reason: string) {
  const booking = await getById(id);
  if (booking.status !== 'PAYMENT_SUBMITTED') {
    throw ApiError.badRequest('Only submitted payments can be declined.');
  }
  return prisma.booking.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
  });
}

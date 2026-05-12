import { prisma } from '../../lib/prisma.js';

export async function getStats() {
  const [
    totalUsers,
    activeTherapists,
    upcomingSessions,
    publishedArticles,
    pendingPayments,
    confirmedToday,
    moodEntriesToday,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.psychologist.count({ where: { isActive: true } }),
    prisma.onlineConversation.count({ where: { dateTime: { gte: new Date() }, status: { in: ['UPCOMING', 'LIVE'] } } }),
    prisma.article.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    prisma.booking.count({ where: { status: 'PAYMENT_SUBMITTED' } }),
    prisma.booking.count({
      where: {
        status: 'CONFIRMED',
        confirmedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.moodEntry.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ]);

  const recentBookings = await prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { fullName: true } }, psychologist: { select: { fullName: true } } },
  });

  return {
    totalUsers,
    activeTherapists,
    upcomingSessions,
    publishedArticles,
    pendingPayments,
    confirmedToday,
    moodEntriesToday,
    recentActivity: recentBookings.map((b) => ({
      id: b.id,
      type: 'booking' as const,
      title: `${b.user.fullName} → ${b.psychologist.fullName}`,
      status: b.status,
      at: b.createdAt,
    })),
  };
}

import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/apiError.js';

export async function listActive() {
  return prisma.psychologist.findMany({
    where: { isActive: true },
    orderBy: { rating: 'desc' },
  });
}

export async function getById(id: string, requireActive = true) {
  const psy = await prisma.psychologist.findUnique({ where: { id } });
  if (!psy || (requireActive && !psy.isActive)) {
    throw ApiError.notFound("We couldn't find that therapist.");
  }
  return psy;
}

interface TimeRange {
  start: string;
  end: string;
}

interface ScheduleException {
  date: string;
  available?: boolean;
}

const DAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

export async function availableSlots(id: string, dateISO: string) {
  const psy = await getById(id);
  const date = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw ApiError.badRequest('Please use a valid date in YYYY-MM-DD format.');
  }

  const exceptions = (psy.scheduleExceptions as unknown as ScheduleException[] | null) ?? [];
  const exceptionForDay = exceptions.find((e) => e.date === dateISO);
  if (exceptionForDay && exceptionForDay.available === false) return [];

  const schedule = (psy.weeklySchedule as unknown as Record<string, TimeRange[] | undefined>) ?? {};
  const dayKey = DAY_KEYS[date.getDay()];
  const ranges = schedule[dayKey] ?? [];

  const taken = await prisma.booking.findMany({
    where: {
      psychologistId: id,
      slotDateTime: {
        gte: date,
        lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
      },
      status: { in: ['PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'CONFIRMED'] },
    },
    select: { slotDateTime: true },
  });
  const takenSet = new Set(taken.map((t) => t.slotDateTime.toISOString()));

  const slots: { start: string; end: string; available: boolean }[] = [];
  for (const range of ranges) {
    const [sh, sm] = range.start.split(':').map(Number);
    const [eh, em] = range.end.split(':').map(Number);
    let cursor = new Date(date);
    cursor.setHours(sh ?? 0, sm ?? 0, 0, 0);
    const end = new Date(date);
    end.setHours(eh ?? 0, em ?? 0, 0, 0);

    while (cursor.getTime() + 50 * 60 * 1000 <= end.getTime()) {
      const slotEnd = new Date(cursor.getTime() + 50 * 60 * 1000);
      const iso = cursor.toISOString();
      slots.push({
        start: iso,
        end: slotEnd.toISOString(),
        available: !takenSet.has(iso),
      });
      cursor = new Date(cursor.getTime() + 60 * 60 * 1000);
    }
  }
  return slots;
}

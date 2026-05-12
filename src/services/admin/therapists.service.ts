import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  TherapistCreateInput,
  TherapistUpdateInput,
} from '../../validators/admin.validator.js';

export async function listAll() {
  return prisma.psychologist.findMany({ orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }] });
}

export async function getById(id: string) {
  const t = await prisma.psychologist.findUnique({ where: { id } });
  if (!t) throw ApiError.notFound("We couldn't find that therapist.");
  return t;
}

export async function create(input: TherapistCreateInput) {
  return prisma.psychologist.create({
    data: {
      ...input,
      pricingByType: input.pricingByType as Prisma.InputJsonValue,
      weeklySchedule: input.weeklySchedule as Prisma.InputJsonValue,
      scheduleExceptions: input.scheduleExceptions as Prisma.InputJsonValue,
    },
  });
}

export async function update(id: string, input: TherapistUpdateInput) {
  await getById(id);
  const data: Prisma.PsychologistUpdateInput = { ...input };
  if (input.pricingByType !== undefined) data.pricingByType = input.pricingByType as Prisma.InputJsonValue;
  if (input.weeklySchedule !== undefined) data.weeklySchedule = input.weeklySchedule as Prisma.InputJsonValue;
  if (input.scheduleExceptions !== undefined) data.scheduleExceptions = input.scheduleExceptions as Prisma.InputJsonValue;
  return prisma.psychologist.update({ where: { id }, data });
}

export async function deactivate(id: string) {
  await getById(id);
  return prisma.psychologist.update({ where: { id }, data: { isActive: false } });
}

export async function updateAvailability(
  id: string,
  data: { weeklySchedule?: unknown; scheduleExceptions?: unknown },
) {
  await getById(id);
  const update: Prisma.PsychologistUpdateInput = {};
  if (data.weeklySchedule !== undefined) update.weeklySchedule = data.weeklySchedule as Prisma.InputJsonValue;
  if (data.scheduleExceptions !== undefined) update.scheduleExceptions = data.scheduleExceptions as Prisma.InputJsonValue;
  return prisma.psychologist.update({ where: { id }, data: update });
}

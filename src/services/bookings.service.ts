import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/apiError.js';
import type {
  CreateBookingInput,
  SubmitProofInput,
} from '../validators/booking.validator.js';

const MOMO_RECEIVER = {
  name: 'Ngabo Brave Olivier',
  number: '+250788312209',
};

const buildPaymentInstructions = (amount: number) => ({
  amount,
  ussdCode: `*182*1*1*0788312209*${amount}#`,
  receiverName: MOMO_RECEIVER.name,
  receiverNumber: MOMO_RECEIVER.number,
  instructions: [
    'Dial the code on the device with the MoMo number.',
    'Confirm the payment to the listed name.',
    'Take a screenshot of the confirmation message, or note the transaction ID.',
    'Submit it on the next screen so we can confirm your booking.',
  ],
});

export async function create(userId: string, input: CreateBookingInput) {
  const psy = await prisma.psychologist.findUnique({ where: { id: input.psychologistId } });
  if (!psy || !psy.isActive) {
    throw ApiError.notFound("We couldn't find that therapist.");
  }
  if (!psy.sessionTypes.includes(input.sessionType)) {
    throw ApiError.badRequest('That session type is not offered by this therapist.');
  }

  const slotAt = new Date(input.slotDateTime);
  if (Number.isNaN(slotAt.getTime()) || slotAt.getTime() < Date.now()) {
    throw ApiError.badRequest('Please choose a future time.');
  }

  const booking = await prisma.$transaction(async (tx) => {
    const conflict = await tx.booking.findFirst({
      where: {
        psychologistId: input.psychologistId,
        slotDateTime: slotAt,
        status: { in: ['PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'CONFIRMED'] },
      },
    });
    if (conflict) {
      throw ApiError.conflict('That time has just been taken. Please pick another.');
    }
    return tx.booking.create({
      data: {
        userId,
        psychologistId: input.psychologistId,
        slotDateTime: slotAt,
        sessionType: input.sessionType,
        amount: input.amount,
      },
    });
  });

  return {
    booking,
    payment: buildPaymentInstructions(input.amount),
  };
}

export async function listForUser(userId: string) {
  return prisma.booking.findMany({
    where: { userId },
    include: { psychologist: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOwn(userId: string, id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { psychologist: true },
  });
  if (!booking || booking.userId !== userId) {
    throw ApiError.notFound("We couldn't find that booking.");
  }
  return booking;
}

export async function submitProof(userId: string, id: string, input: SubmitProofInput) {
  const booking = await getOwn(userId, id);
  if (booking.status !== 'PENDING_PAYMENT') {
    throw ApiError.badRequest('This booking is not waiting for proof.');
  }
  return prisma.booking.update({
    where: { id },
    data: {
      paymentProofURL: input.paymentProofURL,
      transactionId: input.transactionId,
      status: 'PAYMENT_SUBMITTED',
      paymentSubmittedAt: new Date(),
    },
    include: { psychologist: true },
  });
}

export async function cancel(userId: string, id: string, reason?: string) {
  const booking = await getOwn(userId, id);
  if (booking.status === 'CANCELLED' || booking.status === 'REJECTED') {
    throw ApiError.badRequest('This booking has already been closed.');
  }
  return prisma.booking.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      ...(reason ? { rejectionReason: reason } : {}),
    },
    include: { psychologist: true },
  });
}

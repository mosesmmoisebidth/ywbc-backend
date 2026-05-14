import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/apiError.js';
import type {
  CreateBookingInput,
  SubmitProofInput,
} from '../validators/booking.validator.js';

// Platform-level MoMo merchant — replaces the per-therapist MoMo numbers we
// used to collect. One admin number / one merchant code for the whole app.
const MOMO_RECEIVER = {
  name: 'Your Wellbeing Center',
  number: '+250 792 207 293',
  merchantCode: '13450',
};

const buildPaymentInstructions = (amount: number, bookingId: string) => ({
  amount,
  // Both MoMo flows: pay-by-number (USSD *182*1*1*<number>*<amount>#) or
  // pay-by-merchant (*182*8*1*<code>*<amount>#). The mobile UI shows both.
  ussdCode: `*182*1*1*0792207293*${amount}#`,
  merchantCode: MOMO_RECEIVER.merchantCode,
  merchantUssdCode: `*182*8*1*${MOMO_RECEIVER.merchantCode}*${amount}#`,
  receiverName: MOMO_RECEIVER.name,
  receiverNumber: MOMO_RECEIVER.number,
  reference: `YWBC-${bookingId.slice(-6).toUpperCase()}`,
  instructions: [
    `Open *182# on the MoMo number you'll pay from.`,
    `Send ${amount.toLocaleString('en-US')} RWF to ${MOMO_RECEIVER.number} or merchant code ${MOMO_RECEIVER.merchantCode}.`,
    'Note the Transaction ID from the confirmation SMS, or screenshot it.',
    'Come back and tap "Confirm payment".',
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
    payment: buildPaymentInstructions(input.amount, booking.id),
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
  // Allow re-submitting after a REJECTION too — the admin may have asked for
  // corrected details. PENDING_PAYMENT and REJECTED are the two states where
  // the user can still send proof; anything else means we already have it.
  if (booking.status !== 'PENDING_PAYMENT' && booking.status !== 'REJECTED') {
    throw ApiError.badRequest('This booking is not waiting for proof.');
  }
  return prisma.booking.update({
    where: { id },
    data: {
      payerName: input.payerName,
      payerPhone: input.payerPhone,
      paymentProofURL: input.paymentProofURL ?? null,
      transactionId: input.transactionId ?? null,
      status: 'PAYMENT_SUBMITTED',
      paymentSubmittedAt: new Date(),
      // Wipe any prior rejection reason so the admin sees a clean retry.
      rejectionReason: null,
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

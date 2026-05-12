import { z } from 'zod';

export const createBookingSchema = z.object({
  psychologistId: z.string().min(1),
  slotDateTime: z.string().datetime({ message: 'Use a full ISO timestamp.' }),
  sessionType: z.enum(['ONLINE', 'IN_PERSON', 'GROUP']),
  amount: z.number().int().positive(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const submitProofSchema = z.object({
  paymentProofURL: z.string().url(),
  transactionId: z.string().min(3),
});
export type SubmitProofInput = z.infer<typeof submitProofSchema>;

export const cancelBookingSchema = z.object({
  reason: z.string().min(2).max(300).optional(),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

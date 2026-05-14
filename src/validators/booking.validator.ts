import { z } from 'zod';

export const createBookingSchema = z.object({
  psychologistId: z.string().min(1),
  slotDateTime: z.string().datetime({ message: 'Use a full ISO timestamp.' }),
  sessionType: z.enum(['ONLINE', 'IN_PERSON', 'GROUP']),
  amount: z.number().int().positive(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// Manual MoMo confirmation. Per product: payer details are always required,
// and the user submits *either* a Transaction ID *or* a screenshot URL (a
// Cloudinary URL produced by /uploads/image) — at least one, never both
// missing. Both is allowed.
export const submitProofSchema = z
  .object({
    payerName: z.string().min(2, 'Add the name the payment was made under.').max(120),
    payerPhone: z.string().min(5, 'Add the phone number you paid from.').max(40),
    paymentProofURL: z
      .string()
      .url()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    transactionId: z.string().min(3).max(80).optional(),
  })
  .refine(
    (v) => Boolean((v.transactionId && v.transactionId.trim()) || v.paymentProofURL),
    {
      message: 'Please provide either the MoMo Transaction ID or a payment screenshot.',
      path: ['transactionId'],
    },
  );
export type SubmitProofInput = z.infer<typeof submitProofSchema>;

export const cancelBookingSchema = z.object({
  reason: z.string().min(2).max(300).optional(),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

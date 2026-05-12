import { z } from 'zod';

export const registerSessionSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type RegisterSessionInput = z.infer<typeof registerSessionSchema>;

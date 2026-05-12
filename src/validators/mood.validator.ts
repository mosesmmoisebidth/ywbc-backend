import { z } from 'zod';

export const createMoodSchema = z.object({
  mood: z.number().int().min(1).max(5),
  note: z.string().max(500).optional(),
});
export type CreateMoodInput = z.infer<typeof createMoodSchema>;

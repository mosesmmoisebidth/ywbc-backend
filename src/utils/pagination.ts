import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationParams = z.infer<typeof paginationSchema>;

export const skipTake = ({ page, perPage }: PaginationParams) => ({
  skip: (page - 1) * perPage,
  take: perPage,
});

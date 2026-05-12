export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export const ok = <T>(data: T, message?: string) => ({ data, ...(message ? { message } : {}) });

export const paginated = <T>(data: T[], pagination: Pagination) => ({ data, pagination });

export const fail = (
  message: string,
  errors?: Record<string, string>,
  code?: string,
) => ({ message, ...(errors ? { errors } : {}), ...(code ? { code } : {}) });

export const buildPagination = (page: number, perPage: number, total: number): Pagination => ({
  page,
  perPage,
  total,
  totalPages: Math.max(1, Math.ceil(total / perPage)),
});

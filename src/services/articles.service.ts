import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/apiError.js';
import { skipTake, type PaginationParams } from '../utils/pagination.js';
import { buildPagination, paginated } from '../utils/response.js';

export async function listPublished(params: PaginationParams & { category?: string }) {
  const where = {
    status: 'PUBLISHED' as const,
    deletedAt: null,
    ...(params.category ? { category: params.category } : {}),
  };
  const [data, total] = await Promise.all([
    prisma.article.findMany({
      where,
      ...skipTake(params),
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.article.count({ where }),
  ]);
  return paginated(data, buildPagination(params.page, params.perPage, total));
}

export async function getBySlug(slug: string) {
  const article = await prisma.article.findUnique({ where: { slug } });
  if (!article || article.status !== 'PUBLISHED' || article.deletedAt) {
    throw ApiError.notFound("We couldn't find that article.");
  }
  return article;
}

import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { slugify } from '../../utils/slugify.js';
import type { ArticleCreateInput } from '../../validators/admin.validator.js';

const estimateReadingTime = (markdown: string): number => {
  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
};

const ensureUniqueSlug = async (base: string, exceptId?: string): Promise<string> => {
  let slug = base;
  let suffix = 2;
  while (true) {
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (!existing || existing.id === exceptId) return slug;
    slug = `${base}-${suffix++}`;
  }
};

export async function listAll() {
  return prisma.article.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getById(id: string) {
  const a = await prisma.article.findUnique({ where: { id } });
  if (!a || a.deletedAt) throw ApiError.notFound("We couldn't find that article.");
  return a;
}

export async function create(input: ArticleCreateInput) {
  const baseSlug = input.slug ? slugify(input.slug) : slugify(input.title);
  const slug = await ensureUniqueSlug(baseSlug || `article-${Date.now()}`);
  return prisma.article.create({
    data: {
      slug,
      title: input.title,
      excerpt: input.excerpt,
      content: input.content,
      coverImageURL: input.coverImageURL,
      author: input.author,
      category: input.category,
      tags: input.tags ?? [],
      readingTime: input.readingTime ?? estimateReadingTime(input.content),
      status: 'DRAFT',
    },
  });
}

export async function update(id: string, input: Partial<ArticleCreateInput>) {
  const existing = await getById(id);
  const slug =
    input.slug && input.slug !== existing.slug
      ? await ensureUniqueSlug(slugify(input.slug), id)
      : existing.slug;
  return prisma.article.update({
    where: { id },
    data: {
      ...input,
      slug,
      ...(input.content ? { readingTime: input.readingTime ?? estimateReadingTime(input.content) } : {}),
    },
  });
}

export async function publish(id: string) {
  await getById(id);
  return prisma.article.update({
    where: { id },
    data: { status: 'PUBLISHED', publishedAt: new Date(), scheduledFor: null },
  });
}

export async function schedule(id: string, publishAt: string) {
  await getById(id);
  return prisma.article.update({
    where: { id },
    data: { status: 'SCHEDULED', scheduledFor: new Date(publishAt) },
  });
}

export async function softDelete(id: string) {
  await getById(id);
  return prisma.article.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'ARCHIVED' },
  });
}

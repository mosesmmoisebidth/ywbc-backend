import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';

import type { AppEnv } from '../types/hono.js';
import { ok } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { ApiError } from '../lib/apiError.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { sendMessage } from '../services/chat/chat.service.js';

export const chatRoutes = new Hono<AppEnv>();

chatRoutes.use('*', authMiddleware);

// ───────── Conversations ─────────

chatRoutes.post('/conversations', async (c) => {
  const user = c.get('user')!;
  const conversation = await prisma.chatConversation.create({
    data: { userId: user.id },
  });
  return c.json(ok(conversation, 'Conversation started.'));
});

chatRoutes.get('/conversations', async (c) => {
  const user = c.get('user')!;
  const conversations = await prisma.chatConversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true, role: true, createdAt: true },
      },
    },
  });
  return c.json(ok(conversations));
});

chatRoutes.get('/conversations/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const conversation = await prisma.chatConversation.findFirst({
    where: { id, userId: user.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!conversation) throw ApiError.notFound("We couldn't find that conversation.");
  return c.json(ok(conversation));
});

chatRoutes.delete('/conversations/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const conversation = await prisma.chatConversation.findFirst({
    where: { id, userId: user.id },
  });
  if (!conversation) throw ApiError.notFound("We couldn't find that conversation.");
  await prisma.chatConversation.delete({ where: { id } });
  return c.json(ok(null, 'Conversation deleted.'));
});

// ───────── Messages — SSE streaming ─────────

const sendSchema = z.object({
  content: z.string().min(1).max(2000),
});

chatRoutes.post(
  '/conversations/:id/messages',
  validateBody(sendSchema),
  async (c) => {
    const user = c.get('user')!;
    const conversationId = c.req.param('id');
    const { content } = c.get('validated') as z.infer<typeof sendSchema>;

    return streamSSE(c, async (stream) => {
      try {
        for await (const event of sendMessage({
          userId: user.id,
          conversationId,
          content,
        })) {
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(
              event.type === 'token' ? { value: event.value } : { enrichments: event.enrichments },
            ),
          });
        }
      } catch (err) {
        // Log the full error server-side AND surface the message to the
        // client. In dev we want the real reason visible on the mobile
        // bubble so we can debug without tailing logs.
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? `Ubuzima error: ${err.message}`
              : 'Something went gently wrong.';
        logger.error(
          {
            err:
              err instanceof Error
                ? { name: err.name, message: err.message, stack: err.stack }
                : err,
            conversationId,
            userId: user.id,
          },
          '[chat] stream failed',
        );
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ message }),
        });
      }
    });
  },
);

// ───────── Welcome chips — top-priority FAQs as starters ─────────

chatRoutes.get('/starters', async (c) => {
  // Returns up to 8 high-priority FAQs in both languages so the welcome
  // screen can render quick-reply chips that work in either language.
  const faqs = await prisma.fAQ.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    take: 8,
    select: {
      id: true,
      question: true,
      questionRw: true,
      category: true,
    },
  });
  return c.json(ok(faqs));
});

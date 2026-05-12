import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../env.js';
import { detectLanguage, type Language } from './language-detect.js';
import { detectCrisis } from './crisis-detector.js';
import { isObviouslyOffScope } from './scope-guard.js';
import { retrieveContent } from './retrieval.service.js';
import { parseEnrichments } from './enrichment.service.js';
import { streamGeminiResponse } from './gemini.client.js';
import { buildSystemPromptEN } from '../../prompts/system.en.js';
import { buildSystemPromptRW } from '../../prompts/system.rw.js';
import {
  CRISIS_RESPONSE_EN,
  CRISIS_RESPONSE_RW,
  OFF_SCOPE_EN,
  OFF_SCOPE_RW,
  DAILY_BUDGET_EXCEEDED_EN,
  DAILY_BUDGET_EXCEEDED_RW,
} from '../../prompts/refusal-templates.js';

/**
 * Heart of Ubuzima. Each user message walks the same 11-step path:
 *
 *   1. Verify ownership of the conversation
 *   2. Load the last 10 turns for context
 *   3. Detect language (EN vs RW)
 *   4. Persist the user message
 *   5. Crisis check — if flagged, stream crisis template, flag conversation,
 *      notify admin, and stop. Gemini is NEVER called.
 *   6. Daily budget check — soft cap on assistant messages per day
 *   7. Scope guard — obvious off-topic prompts get the gentle refusal
 *   8. RAG — pull relevant YWBC content (faqs, quotes, meds, therapists,
 *      sessions, tips)
 *   9. Stream from Gemini — buffer the full text for later parsing
 *  10. Parse enrichment tags out of the buffered text
 *  11. Persist the assistant message with parsed enrichments
 *
 * Yielded events:
 *   { type: 'token',  value: string }
 *   { type: 'done',   enrichments: { enrichments, quickActions } | null }
 */

export type StreamEvent =
  | { type: 'token'; value: string }
  | { type: 'done'; enrichments: { enrichments: unknown; quickActions: unknown } | null };

interface SendMessageInput {
  userId: string;
  conversationId: string;
  content: string;
}

const startOfTodayUTC = (): Date => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Streams a static refusal string char-by-char so the UI still feels alive
// even when Gemini wasn't called.
async function* streamStatic(text: string): AsyncGenerator<string, void, unknown> {
  for (const ch of text) {
    yield ch;
    // Tiny breathing space — feels more human than a single chunk.
    if (Math.random() < 0.05) {
      await new Promise((r) => setTimeout(r, 8));
    }
  }
}

export async function* sendMessage(
  input: SendMessageInput,
): AsyncGenerator<StreamEvent, void, unknown> {
  const { userId, conversationId, content } = input;
  const t0 = Date.now();
  const step = (name: string, extra?: Record<string, unknown>) =>
    logger.info({ step: name, ms: Date.now() - t0, conversationId, ...extra }, '[chat] step');

  step('start');

  // 1. Ownership check.
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!conversation) {
    step('conversation_not_found');
    throw ApiError.notFound("We couldn't find that conversation.");
  }
  step('conversation_found');

  // 2. Recent history (oldest → newest).
  const history = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  history.reverse();
  step('history_loaded', { count: history.length });

  // 3. Detect language from the new turn.
  const language: Language = detectLanguage(content);
  step('language_detected', { language });

  // 4. Persist user message.
  await prisma.chatMessage.create({
    data: {
      conversationId,
      role: 'USER',
      content,
      language,
    },
  });
  step('user_message_persisted');

  // 5. CRISIS — fires before anything else.
  if (detectCrisis(content)) {
    const text = language === 'RW' ? CRISIS_RESPONSE_RW : CRISIS_RESPONSE_EN;
    for await (const ch of streamStatic(text)) {
      yield { type: 'token', value: ch };
    }
    await prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: text,
        language,
        isCrisis: true,
      },
    });
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { hasCrisisFlag: true },
    });
    await prisma.adminNotification.create({
      data: {
        type: 'CRISIS_FLAG',
        title: 'A user may need urgent care',
        body: `Conversation ${conversationId.slice(0, 8)}… was flagged.`,
        payload: { conversationId, userId },
      },
    });
    yield { type: 'done', enrichments: null };
    return;
  }

  // 6. Daily budget check (assistant messages today across all users).
  const todayCount = await prisma.chatMessage.count({
    where: { role: 'ASSISTANT', createdAt: { gte: startOfTodayUTC() } },
  });
  if (todayCount >= env.CHAT_DAILY_MESSAGE_BUDGET) {
    const text = language === 'RW' ? DAILY_BUDGET_EXCEEDED_RW : DAILY_BUDGET_EXCEEDED_EN;
    for await (const ch of streamStatic(text)) {
      yield { type: 'token', value: ch };
    }
    await prisma.chatMessage.create({
      data: { conversationId, role: 'ASSISTANT', content: text, language },
    });
    yield { type: 'done', enrichments: null };
    return;
  }

  step('passed_crisis_and_budget');

  // 7. Scope guard — obvious off-topic prompts skip Gemini entirely.
  if (isObviouslyOffScope(content)) {
    const text = language === 'RW' ? OFF_SCOPE_RW : OFF_SCOPE_EN;
    for await (const ch of streamStatic(text)) {
      yield { type: 'token', value: ch };
    }
    await prisma.chatMessage.create({
      data: { conversationId, role: 'ASSISTANT', content: text, language },
    });
    yield { type: 'done', enrichments: null };
    return;
  }

  // 8. RAG.
  step('retrieval_start');
  let retrievedContent = '';
  try {
    const result = await retrieveContent(content, language);
    retrievedContent = result.rendered;
    step('retrieval_done', { chars: retrievedContent.length });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? { message: err.message, stack: err.stack } : err },
      '[chat] retrieval failed',
    );
    // Don't fail the whole turn just because RAG broke — fall back to no
    // injected content. Gemini can still answer from general knowledge.
    retrievedContent = '';
  }

  // 9. Build prompt + stream.
  const recentHistory = history
    .map((m) => `${m.role === 'USER' ? 'User' : 'Ubuzima'}: ${m.content}`)
    .join('\n');

  const promptCtx = { userMessage: content, recentHistory, retrievedContent };
  const systemPrompt =
    language === 'RW' ? buildSystemPromptRW(promptCtx) : buildSystemPromptEN(promptCtx);
  step('prompt_built', { promptChars: systemPrompt.length });

  let buffer = '';
  let geminiStarted = false;
  try {
    for await (const token of streamGeminiResponse(systemPrompt)) {
      if (!geminiStarted) {
        geminiStarted = true;
        step('gemini_first_token');
      }
      buffer += token;
      // We yield the raw token; the mobile client doesn't see the tag
      // brackets because Gemini almost always emits IDs after the natural
      // sentence is finished (per the prompt). If a tag does land mid-flow
      // it'll be cleaned out client-side on the final 'done' payload.
      yield { type: 'token', value: token };
    }
  } catch (err) {
    logger.error({ err }, 'gemini stream failed');
    const fallback =
      language === 'RW'
        ? 'Hari ikintu kitagenze neza. Mbabarira — gerageza nanone mu kanya.'
        : 'Something went gently wrong. Please try again in a moment.';
    for await (const ch of streamStatic(fallback)) {
      yield { type: 'token', value: ch };
    }
    await prisma.chatMessage.create({
      data: { conversationId, role: 'ASSISTANT', content: fallback, language },
    });
    yield { type: 'done', enrichments: null };
    return;
  }

  // 10. Parse enrichments.
  const { cleanText, enrichments, quickActions } = parseEnrichments(buffer);
  const finalText = cleanText || buffer;

  // 11. Persist assistant message + maybe title the conversation.
  await prisma.chatMessage.create({
    data: {
      conversationId,
      role: 'ASSISTANT',
      content: finalText,
      enrichments: enrichments as unknown as object,
      quickActions: quickActions as unknown as object,
      language,
    },
  });

  if (history.length === 0 && !conversation.title) {
    const title = content.slice(0, 60) + (content.length > 60 ? '…' : '');
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { title, language },
    });
  } else {
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  yield {
    type: 'done',
    enrichments: { enrichments, quickActions },
  };
}

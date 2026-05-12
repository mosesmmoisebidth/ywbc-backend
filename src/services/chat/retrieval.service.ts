import { prisma } from '../../lib/prisma.js';
import type { Language } from './language-detect.js';

/**
 * Retrieval-Augmented Generation (RAG) lite. Pulls the YWBC content that's
 * relevant to the user's message and formats it into a compact block we
 * inject into the Gemini prompt. No vector DB needed for v1 — topic-keyword
 * mapping covers our domain (mental health, therapy, nutrition, app help).
 *
 * Budget: target ~1,500 tokens of retrieved text. The formatter caps each
 * row's contribution to keep total small. Gemini's 1M context is plenty,
 * but a tight prompt makes the model focus.
 */

const TOPICS: Record<string, RegExp> = {
  anxiety: /anxiet|panic|worry|fear|ubwoba|umuhangayiko/i,
  depression: /depress|sad|hopeless|agahinda|ihahamuka|kwiheba/i,
  sleep: /sleep|insomnia|tired|kuryama|umutsindo|sinaryamye/i,
  trauma: /trauma|abuse|hurt|past|ihohoterwa|guhungabana/i,
  relationships: /relationship|partner|family|imibanire|umuryango/i,
  nutrition: /food|eat|nutrition|diet|hunger|hydration|ibiryo|imirire|amazi/i,
  booking: /book|appointment|session|therapist|muganga|gusaba|saba/i,
  payment: /pay|momo|cost|price|amount|kwishyura|amafaranga/i,
  meditation: /meditat|breath|calm|relax|guhumeka|gutuza/i,
  grief: /grief|loss|mourning|agahinda|kubaka/i,
};

function matchTopics(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(TOPICS)
    .filter(([, re]) => re.test(lower))
    .map(([k]) => k);
}

interface RetrievedContent {
  faqs: { id: string; question: string; answer: string }[];
  quotes: { id: string; text: string; author: string; category: string }[];
  tips: { id: string; title: string; description: string }[];
  meditations: {
    id: string;
    title: string;
    description: string;
    duration: number;
    category: string;
  }[];
  therapists: {
    id: string;
    name: string;
    title: string;
    specialties: string[];
    languages: string[];
  }[];
  sessions: { id: string; title: string; description: string; dateTime: Date }[];
}

export async function retrieveContent(
  userMessage: string,
  language: Language,
): Promise<{ rendered: string; content: RetrievedContent }> {
  const matched = matchTopics(userMessage);

  const [faqRows, quoteRows, tipRows, meditationRows, therapistRows, sessionRows] =
    await Promise.all([
      prisma.fAQ.findMany({
        where: {
          isActive: true,
          ...(matched.length > 0
            ? {
                OR: matched.flatMap((t) => [
                  { question: { contains: t, mode: 'insensitive' as const } },
                  { answer: { contains: t, mode: 'insensitive' as const } },
                ]),
              }
            : {}),
        },
        take: 4,
        orderBy: { order: 'asc' },
      }),

      prisma.dailyQuote.findMany({
        where: {
          isActive: true,
          category: matched.includes('nutrition')
            ? { in: ['NUTRITION' as const, 'WELLNESS' as const] }
            : { in: ['WELLNESS' as const, 'MOTIVATION' as const, 'RECONCILIATION' as const] },
        },
        take: 3,
        orderBy: { createdAt: 'desc' },
      }),

      matched.includes('nutrition')
        ? prisma.nutritionTip.findMany({ where: { isActive: true }, take: 3 })
        : Promise.resolve([] as { id: string; title: string; description: string }[]),

      matched.some((t) => ['anxiety', 'sleep', 'meditation', 'trauma'].includes(t))
        ? prisma.meditation.findMany({
            where: {
              status: 'PUBLISHED',
              ...(matched.includes('sleep')
                ? { category: { in: ['SLEEP' as const, 'BREATHING' as const] } }
                : matched.includes('anxiety')
                  ? { category: { in: ['ANXIETY' as const, 'BREATHING' as const] } }
                  : {}),
            },
            take: 3,
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve(
            [] as {
              id: string;
              title: string;
              description: string;
              duration: number;
              category: string;
            }[],
          ),

      matched.some((t) =>
        ['booking', 'trauma', 'anxiety', 'depression', 'grief', 'relationships'].includes(t),
      )
        ? prisma.psychologist.findMany({
            where: {
              isActive: true,
              ...(matched.includes('trauma')
                ? { specialties: { hasSome: ['Trauma healing', 'Resilience'] } }
                : matched.includes('grief')
                  ? { specialties: { hasSome: ['Grief & loss'] } }
                  : matched.includes('relationships')
                    ? { specialties: { hasSome: ['Couples', 'Family'] } }
                    : matched.includes('anxiety') || matched.includes('depression')
                      ? { specialties: { hasSome: ['Anxiety', 'Depression', 'Resilience'] } }
                      : {}),
            },
            take: 3,
          })
        : Promise.resolve(
            [] as {
              id: string;
              fullName: string;
              title: string;
              specialties: string[];
              languages: string[];
            }[],
          ),

      prisma.onlineConversation.findMany({
        where: {
          status: 'UPCOMING',
          dateTime: { gte: new Date() },
        },
        take: 3,
        orderBy: { dateTime: 'asc' },
      }),
    ]);

  // Normalise into a small projection. Pick the language-appropriate FAQ
  // text when Kinyarwanda translations exist.
  const content: RetrievedContent = {
    faqs: faqRows.map((f) => ({
      id: f.id,
      question: language === 'RW' && f.questionRw ? f.questionRw : f.question,
      answer: language === 'RW' && f.answerRw ? f.answerRw : f.answer,
    })),
    quotes: quoteRows.map((q) => ({
      id: q.id,
      text: q.text,
      author: q.author,
      category: q.category,
    })),
    tips: tipRows.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
    })),
    meditations: meditationRows.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      duration: m.duration,
      category: m.category,
    })),
    therapists: therapistRows.map((p) => ({
      id: p.id,
      name: p.fullName,
      title: p.title,
      specialties: p.specialties,
      languages: p.languages,
    })),
    sessions: sessionRows.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      dateTime: s.dateTime,
    })),
  };

  return { rendered: formatRetrievedContent(content), content };
}

function trim(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

function formatRetrievedContent(c: RetrievedContent): string {
  const parts: string[] = [];

  if (c.faqs.length > 0) {
    parts.push('--- RELEVANT FAQS ---');
    c.faqs.forEach((f) => {
      parts.push(`[FAQ_ID: ${f.id}] Q: ${trim(f.question, 120)}\nA: ${trim(f.answer, 240)}`);
    });
  }

  if (c.quotes.length > 0) {
    parts.push('\n--- AVAILABLE QUOTES (attach with [QUOTE_ID: xxx]) ---');
    c.quotes.forEach((q) => {
      parts.push(`[QUOTE_ID: ${q.id}] "${trim(q.text, 180)}" — ${q.author} (${q.category})`);
    });
  }

  if (c.tips.length > 0) {
    parts.push('\n--- NUTRITION TIPS ---');
    c.tips.forEach((t) => {
      parts.push(`${trim(t.title, 60)}: ${trim(t.description, 160)}`);
    });
  }

  if (c.meditations.length > 0) {
    parts.push('\n--- AVAILABLE MEDITATIONS (attach with [MEDITATION_ID: xxx]) ---');
    c.meditations.forEach((m) => {
      const mins = Math.max(1, Math.round(m.duration / 60));
      parts.push(
        `[MEDITATION_ID: ${m.id}] ${trim(m.title, 60)} (${mins} min · ${m.category}) — ${trim(m.description, 140)}`,
      );
    });
  }

  if (c.therapists.length > 0) {
    parts.push('\n--- THERAPISTS YOU CAN SUGGEST (attach with [THERAPIST_ID: xxx]) ---');
    c.therapists.forEach((t) => {
      parts.push(
        `[THERAPIST_ID: ${t.id}] ${t.name}, ${t.title}. Specialties: ${t.specialties.slice(0, 3).join(', ')}. Speaks: ${t.languages.join(', ')}.`,
      );
    });
  }

  if (c.sessions.length > 0) {
    parts.push('\n--- UPCOMING GROUP SESSIONS (attach with [SESSION_ID: xxx]) ---');
    c.sessions.forEach((s) => {
      const when = s.dateTime.toISOString().slice(0, 10);
      parts.push(`[SESSION_ID: ${s.id}] "${trim(s.title, 80)}" on ${when}. ${trim(s.description, 120)}`);
    });
  }

  return parts.join('\n') || 'No specific content matched — answer from general wellness knowledge within scope.';
}

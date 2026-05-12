/**
 * Strips Ubuzima's inline content tags from the streamed response and
 * returns them as structured data the mobile app can render alongside the
 * message bubble.
 *
 * Tags Gemini knows how to emit (defined in system.{en,rw}.ts):
 *   [QUOTE_ID: <cuid>]
 *   [MEDITATION_ID: <cuid>]
 *   [THERAPIST_ID: <cuid>]
 *   [SESSION_ID: <cuid>]
 *   [FAQ_ID: <cuid>]
 *   [QUICK_ACTION: <type> | <label> | <payload>]
 *
 * After parsing, the tags are removed from the text so the chat bubble
 * itself stays clean.
 */

export type QuickActionType =
  | 'book_therapist'
  | 'view_meditation'
  | 'register_session'
  | 'view_article'
  | 'view_faq'
  | 'browse_therapists';

export interface QuickAction {
  type: QuickActionType | string;
  label: string;
  payload: string;
}

export interface ParsedEnrichments {
  quoteIds: string[];
  meditationIds: string[];
  therapistIds: string[];
  sessionIds: string[];
  faqIds: string[];
}

export interface ParseResult {
  cleanText: string;
  enrichments: ParsedEnrichments;
  quickActions: QuickAction[];
  /** Short follow-up question chips the user can tap to send next. */
  followUps: string[];
}

const ID_PATTERNS: { key: keyof ParsedEnrichments; re: RegExp }[] = [
  { key: 'quoteIds',      re: /\[QUOTE_ID:\s*([^\]]+)\]/g },
  { key: 'meditationIds', re: /\[MEDITATION_ID:\s*([^\]]+)\]/g },
  { key: 'therapistIds',  re: /\[THERAPIST_ID:\s*([^\]]+)\]/g },
  { key: 'sessionIds',    re: /\[SESSION_ID:\s*([^\]]+)\]/g },
  { key: 'faqIds',        re: /\[FAQ_ID:\s*([^\]]+)\]/g },
];

const QUICK_ACTION_RE = /\[QUICK_ACTION:\s*([^|\]]+)\|\s*([^|\]]+)\|\s*([^\]]+)\]/g;

// Follow-up suggestions emitted by Gemini at the end of a response:
//   [FOLLOWUP: question one | question two | question three]
// We split on `|` to support 1–4 chips.
const FOLLOWUP_RE = /\[FOLLOWUP:\s*([^\]]+)\]/g;

export function parseEnrichments(text: string): ParseResult {
  const enrichments: ParsedEnrichments = {
    quoteIds: [],
    meditationIds: [],
    therapistIds: [],
    sessionIds: [],
    faqIds: [],
  };
  const quickActions: QuickAction[] = [];
  const followUps: string[] = [];

  let working = text;

  // Extract follow-up chips first, then strip from the visible bubble.
  working = working.replace(FOLLOWUP_RE, (_match, raw: string) => {
    raw
      .split('|')
      .map((q) => q.trim())
      .filter((q) => q.length > 0 && q.length <= 120)
      .slice(0, 4)
      .forEach((q) => {
        if (!followUps.includes(q)) followUps.push(q);
      });
    return '';
  });

  // Extract IDs, dedupe per category.
  for (const { key, re } of ID_PATTERNS) {
    working = working.replace(re, (_match, raw: string) => {
      const id = raw.trim();
      if (id && !enrichments[key].includes(id)) enrichments[key].push(id);
      return '';
    });
  }

  // Extract quick actions.
  working = working.replace(QUICK_ACTION_RE, (_match, type: string, label: string, payload: string) => {
    quickActions.push({
      type: type.trim(),
      label: label.trim(),
      payload: payload.trim(),
    });
    return '';
  });

  // Collapse the whitespace left behind by stripped tags, but preserve
  // intentional newlines (we don't want to merge paragraphs).
  const cleanText = working
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { cleanText, enrichments, quickActions, followUps };
}

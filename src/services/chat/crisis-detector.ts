/**
 * Crisis keyword detector. False positives are acceptable here — better to
 * over-trigger the support flow than miss someone in real danger.
 *
 * Keep this list narrow: every phrase needs to be specific enough that
 * "feeling tired, want to lie down" doesn't trip it. Use phrase-level
 * matches, not single words.
 */

const CRISIS_PHRASES_EN = [
  'kill myself',
  'killing myself',
  'end my life',
  'end it all',
  'suicide',
  'suicidal',
  'want to die',
  "i want to die",
  'better off dead',
  'no reason to live',
  "can't go on",
  'cant go on',
  'hurt myself',
  'cut myself',
  'harm myself',
  'no point in living',
  "i'm done with life",
  'give up on life',
];

const CRISIS_PHRASES_RW = [
  'kwiyahura',
  'kwiyica',
  'kuvaho',
  'kurangiza ubuzima',
  'sinshobora kongera kubaho',
  'nshaka gupfa',
  'nta cyiringiro',
  'nta mpamvu yo kubaho',
  'kwikomeretsa',
  'kwitemagura',
  'sindahari',
];

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    CRISIS_PHRASES_EN.some((p) => lower.includes(p)) ||
    CRISIS_PHRASES_RW.some((p) => lower.includes(p))
  );
}

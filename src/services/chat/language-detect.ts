/**
 * Cheap, no-ML Kinyarwanda vs English detection. Good enough for v1 — refine
 * later by counting against a larger corpus or adding fasttext if needed.
 *
 * The heuristic combines:
 *   - Exact-word hits against a curated marker list per language
 *   - A bonus for Kinyarwanda-shaped morphology (common prefixes/infixes)
 *
 * Ties default to English because the app's primary copy is in English, so
 * fallback there is the safest choice.
 */

const RW_MARKERS = new Set([
  'muraho', 'mwaramutse', 'mwiriwe', 'amakuru', 'urakoze', 'murakoze',
  'nshobora', 'ndashaka', 'nkeneye', 'nfite', 'ndumva', 'numva',
  'ubuzima', 'ubwoba', 'umuhangayiko', 'agahinda', 'kwishyura',
  'nyamuneka', 'mfasha', 'mbwira', 'ikibazo', 'igisubizo',
  'umuganga', 'umugabo', 'umugore', 'umwana', 'umuryango',
  'amazi', 'ibiryo', 'kuryama', 'gukira', 'kwiyumva',
  'kandi', 'cyangwa', 'ariko', 'kuko', 'mbese', 'niba',
  'imibereho', 'guhumeka', 'gutekereza',
]);

const EN_MARKERS = new Set([
  'hello', 'hi', 'how', 'what', 'can', 'help', 'feel', 'feeling',
  'anxious', 'depressed', 'tired', 'sleep', 'stress', 'sad', 'happy',
  'therapist', 'session', 'book', 'mood', 'health', 'doctor', 'today',
  'please', 'thank', 'thanks', 'about', 'with', 'have', 'need',
]);

// Kinyarwanda prefixes — verbs and noun classes often start with these.
const RW_PREFIX_RE = /^(nd|mu|umu|aba|ubu|iki|ibi|uku|aha|nta|kuba|gut|kub|nta|gus|kwi|kwa)/;

export type Language = 'EN' | 'RW';

export function detectLanguage(text: string): Language {
  const lower = text.toLowerCase().trim();
  if (!lower) return 'EN';

  const words = lower.split(/[^a-z']+/).filter(Boolean);
  if (words.length === 0) return 'EN';

  let rwScore = 0;
  let enScore = 0;

  for (const word of words) {
    if (RW_MARKERS.has(word)) rwScore += 1;
    if (EN_MARKERS.has(word)) enScore += 1;
    if (RW_PREFIX_RE.test(word)) rwScore += 0.4;
  }

  return rwScore > enScore ? 'RW' : 'EN';
}

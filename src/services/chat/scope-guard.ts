/**
 * Pre-flight off-scope detector. Catches the most obvious off-topic prompts
 * (code, math, news, sports, generic recipes) BEFORE calling Gemini so we
 * spend zero quota on them and the refusal copy stays consistent.
 *
 * False negatives are fine — Gemini's system prompt is the next line of
 * defence. We just want to skip the obvious cases.
 */

const OFF_SCOPE_PATTERNS: RegExp[] = [
  // Code / technical
  /\b(code|coding|javascript|typescript|python|react|html|css|debug|sql|api endpoint|function returns|stack trace|github)\b/i,
  // Math
  /\bcalculate\b|\d+\s*[+\-*/]\s*\d+|\bsolve.*equation\b|\bintegral\b|\bderivative\b|\bmatrix\b/i,
  // News / politics / current events
  /\b(election|president|prime minister|news about|kagame|trump|biden|war in|breaking news)\b/i,
  // Sports
  /\b(football match|soccer match|nba|premier league|world cup|olympics|fixture|score of)\b/i,
  // Off-topic recipes (allow recipes tied to mood / wellness / sleep / etc.)
  /\brecipe for (?!(mood|stress|anxiety|sleep|wellbeing|focus|grief|breath|calm))/i,
  // Weather + travel
  /\b(weather|forecast|flight to|hotel in|tourist|visa)\b/i,
];

export function isObviouslyOffScope(text: string): boolean {
  return OFF_SCOPE_PATTERNS.some((p) => p.test(text));
}

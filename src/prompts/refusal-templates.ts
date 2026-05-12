/**
 * Pre-canned responses that bypass Gemini entirely. Used for:
 *   - Crisis flow (safety-critical; we don't want any model variation here)
 *   - Obviously off-scope messages (saves an API call + ensures consistent
 *     refusal copy)
 *
 * Wording was chosen with Dr. Brave's voice: warm, dignifying, never harsh.
 * Edit with care — every word here will be read at a moment that matters.
 */

export const CRISIS_RESPONSE_EN = `What you're feeling matters, and I'm glad you told me. Right now, please reach out to someone trained to help:

Isange One Stop Center: 3512 (free, 24/7)
Rwanda Police emergency: 112

If you can, find someone you trust to be with you. You don't have to go through this alone. I'm here too, whenever you're ready to talk.`;

export const CRISIS_RESPONSE_RW = `Ibyo wumva ni iby'agaciro, kandi nishimiye ko wabimbwiye. Nyamuneka, vugana n'umuntu utozwe kugufasha:

Isange One Stop Center: 3512 (ubuntu, masaha 24/24)
Polisi y'u Rwanda: 112

Niba ushobora, shaka umuntu wizera kubana nawe. Ntukeneye kwihangana wenyine. Ndi hano nanjye, igihe icyo aricyo cyose ushaka kuvuga.`;

export const OFF_SCOPE_EN = `That's outside what I'm here for. But if there's something weighing on you, I'm listening.`;

export const OFF_SCOPE_RW = `Ibyo biri hanze y'ibyo nshyizweho. Ariko niba hari ikintu kikuremereye, ndakumva.`;

export const DAILY_BUDGET_EXCEEDED_EN = `Ubuzima is resting for a few hours. Please try again later — or reach out to a therapist directly if it can't wait.`;

export const DAILY_BUDGET_EXCEEDED_RW = `Ubuzima ararimo aruhuka kuva mu masaha make. Nyamuneka, gerageza nanone — cyangwa uvugane n'umuganga niba bitarinda.`;

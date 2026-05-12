import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { env } from '../../env.js';
import { ApiError } from '../../lib/apiError.js';
import { logger } from '../../lib/logger.js';

/**
 * Lazy Gemini client. We don't instantiate at module load because the API
 * key is optional (so the rest of the app can boot without it) — the chat
 * route throws a friendly error when it's actually called and the key is
 * absent.
 *
 * The free tier of Gemini Flash gives 1,500 requests/day, 1M-token context.
 * Generation config is intentionally tight: short outputs (the brief is
 * very clear about brevity), warm-but-consistent temperature.
 */

let cached: GenerativeModel | null = null;

function client(): GenerativeModel {
  if (cached) return cached;
  if (!env.GEMINI_API_KEY) {
    throw ApiError.badRequest(
      'Ubuzima is not configured on the server right now. Try again shortly.',
    );
  }
  const sdk = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  cached = sdk.getGenerativeModel({
    model: env.GEMINI_MODEL,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 512,
    },
  });
  return cached;
}

export async function* streamGeminiResponse(
  systemPrompt: string,
): AsyncGenerator<string, void, unknown> {
  const model = client();
  let result;
  try {
    // Pass the prompt as a single user turn. The newer SDK accepts both a
    // bare string and a structured `contents` array; the structured form is
    // more robust to long prompts.
    result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
    });
  } catch (err) {
    logger.error(
      {
        err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        model: env.GEMINI_MODEL,
      },
      '[gemini] generateContentStream failed at call site',
    );
    throw err;
  }

  try {
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  } catch (err) {
    logger.error(
      {
        err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
      },
      '[gemini] stream iteration failed',
    );
    throw err;
  }
}

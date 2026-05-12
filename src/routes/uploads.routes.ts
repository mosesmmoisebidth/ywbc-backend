import { Hono } from 'hono';
import type { AppEnv } from '../types/hono.js';
import { ok } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { uploadLimiter } from '../middleware/rateLimit.middleware.js';
import { ApiError } from '../lib/apiError.js';
import { uploadImage } from '../lib/cloudinary.js';
import { uploadAudio as uploadAudioR2 } from '../lib/r2.js';

/**
 * File-upload endpoints.
 *
 * Storage routing:
 *   - IMAGES → Cloudinary. We use Cloudinary's on-the-fly transforms (resize,
 *     crop, format conversion, image CDN) all over the app, so storing image
 *     originals there is the natural fit.
 *   - AUDIO → Cloudflare R2. R2's zero egress pricing matters for meditation
 *     and podcast files that get streamed repeatedly — Cloudinary would bill
 *     us for every replay.
 */

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_AUDIO = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
]);
const IMAGE_LIMIT = 10 * 1024 * 1024;
const AUDIO_LIMIT = 50 * 1024 * 1024;

export const uploadsRoutes = new Hono<AppEnv>();
uploadsRoutes.use('*', authMiddleware, uploadLimiter);

const folderFromQuery = (raw: string | undefined, fallback: string) => {
  if (!raw) return fallback;
  const safe = raw.replace(/[^a-z0-9_-]/gi, '').slice(0, 32);
  return safe || fallback;
};

uploadsRoutes.post('/image', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!(file instanceof File)) throw ApiError.badRequest('Please attach an image as `file`.');
  if (!ALLOWED_IMAGE.has(file.type)) {
    throw ApiError.badRequest('Use a JPG, PNG, or WebP image.');
  }
  if (file.size > IMAGE_LIMIT) {
    throw ApiError.badRequest('Images need to be under 10 MB.');
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const folder = folderFromQuery(c.req.query('folder'), 'misc');
  const result = await uploadImage(buffer, folder);
  return c.json(ok(result, 'Image uploaded.'));
});

uploadsRoutes.post('/audio', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!(file instanceof File)) throw ApiError.badRequest('Please attach an audio file as `file`.');
  if (!ALLOWED_AUDIO.has(file.type)) {
    throw ApiError.badRequest('Use an MP3, M4A, or WAV audio file.');
  }
  if (file.size > AUDIO_LIMIT) {
    throw ApiError.badRequest('Audio files need to be under 50 MB.');
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const folder = folderFromQuery(c.req.query('folder'), 'audio');
  const result = await uploadAudioR2(buffer, folder, file.type, file.name);
  return c.json(ok(result, 'Audio uploaded.'));
});

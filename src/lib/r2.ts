import { randomBytes } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { env } from '../env.js';
import { ApiError } from './apiError.js';
import { logger } from './logger.js';

/**
 * Cloudflare R2 client. R2 is S3-compatible, so we use the AWS SDK with the
 * R2 endpoint. We use it specifically for AUDIO files (meditations, podcast)
 * because R2's zero-egress pricing makes streaming replays free, unlike
 * Cloudinary or S3 proper.
 *
 * Images go to Cloudinary (see `cloudinary.ts`) because Cloudinary gives us
 * on-the-fly transforms (resize, crop, format conversion) we use everywhere.
 */

let cachedClient: S3Client | null = null;
let warnedMissing = false;

function client(): S3Client | null {
  if (cachedClient) return cachedClient;
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET_NAME ||
    !env.R2_ENDPOINT
  ) {
    if (!warnedMissing) {
      logger.warn('R2 credentials missing — audio uploads will fail until they are set.');
      warnedMissing = true;
    }
    return null;
  }
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  return cachedClient;
}

const safeFolder = (raw: string) => raw.replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'misc';

/**
 * Build the public URL for an uploaded key. R2 surfaces objects via the
 * "public bucket URL" (R2_PUBLIC_URL) which is configured on the dashboard
 * by enabling a public R2.dev domain or a custom CNAME.
 */
function publicUrl(key: string): string {
  const base = env.R2_PUBLIC_URL ?? '';
  return `${base.replace(/\/$/, '')}/${key}`;
}

export interface R2UploadResult {
  url: string;
  key: string;
  size: number;
}

export async function uploadAudio(
  buffer: Buffer,
  folder: string,
  contentType: string,
  originalName?: string,
): Promise<R2UploadResult> {
  const c = client();
  if (!c) throw ApiError.badRequest('Audio uploads are temporarily unavailable.');

  const ext = inferExtension(originalName, contentType);
  const key = `ywbc/${safeFolder(folder)}/${randomBytes(12).toString('hex')}${ext}`;

  await c.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Make the object readable through the public R2.dev domain.
      // (R2 ignores S3 ACLs — public access is configured at bucket level.)
    }),
  );

  return { url: publicUrl(key), key, size: buffer.length };
}

function inferExtension(name: string | undefined, contentType: string): string {
  if (name && name.includes('.')) {
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    if (/^\.[a-z0-9]{1,5}$/.test(ext)) return ext;
  }
  if (contentType === 'audio/mpeg' || contentType === 'audio/mp3') return '.mp3';
  if (contentType === 'audio/m4a' || contentType === 'audio/x-m4a') return '.m4a';
  if (contentType === 'audio/wav' || contentType === 'audio/x-wav') return '.wav';
  return '';
}

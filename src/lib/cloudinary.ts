import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { env } from '../env.js';
import { logger } from './logger.js';
import { ApiError } from './apiError.js';

/**
 * Cloudinary client — used for IMAGES only (psychologist photos, article
 * cover images, payment-proof screenshots). Audio lives on Cloudflare R2
 * (see `r2.ts`) so we are not charged egress on stream replays.
 */

let configured = false;
let warnedMissing = false;

function ensureConfigured() {
  if (configured) return true;
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    if (!warnedMissing) {
      logger.warn('Cloudinary credentials missing — image uploads will fail until they are set.');
      warnedMissing = true;
    }
    return false;
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
  return true;
}

const upload = (buffer: Buffer, folder: string): Promise<UploadApiResponse> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `ywbc/${folder}`, resource_type: 'image' },
      (error, result) => {
        if (error || !result) reject(error ?? new Error('Upload failed'));
        else resolve(result);
      },
    );
    stream.end(buffer);
  });

export async function uploadImage(buffer: Buffer, folder: string) {
  if (!ensureConfigured()) {
    throw ApiError.badRequest('Image uploads are temporarily unavailable.');
  }
  const result = await upload(buffer, folder);
  return { url: result.secure_url, publicId: result.public_id };
}

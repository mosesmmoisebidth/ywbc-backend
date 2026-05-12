import nodemailer, { type Transporter } from 'nodemailer';

import { env } from '../env.js';
import { logger } from './logger.js';

/**
 * Email delivery via SMTP. The transport is built lazily and cached for the
 * lifetime of the process. When credentials are absent (e.g. local dev with
 * no `.env` SMTP keys) `sendMail` falls back to a console log so flows still
 * complete and the verification code is visible to the developer.
 */

let cached: Transporter | null = null;

function transport(): Transporter | null {
  if (!env.EMAIL_HOST_USER || !env.EMAIL_HOST_PASSWORD) return null;
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_PORT === 465,
    auth: { user: env.EMAIL_HOST_USER, pass: env.EMAIL_HOST_PASSWORD },
  });
  return cached;
}

function fromHeader(): string {
  const addr = env.DEFAULT_FROM_EMAIL ?? env.EMAIL_HOST_USER ?? 'noreply@yourwellbeingcenter.rw';
  return `${env.EMAIL_FROM_NAME} <${addr}>`;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail({ to, subject, html, text }: SendArgs): Promise<void> {
  const t = transport();
  if (!t) {
    // Surface a console-readable copy when SMTP is not configured.
    logger.info(
      { to, subject, preview: text.slice(0, 240) },
      '[mailer] SMTP not configured — email skipped (dev fallback)',
    );
    return;
  }

  try {
    const info = await t.sendMail({ from: fromHeader(), to, subject, html, text });
    logger.info({ to, subject, messageId: info.messageId }, 'email sent');
  } catch (err) {
    // Never throw — auth flows must succeed even if email fails. Log loudly.
    logger.error({ err, to, subject }, 'email send failed');
  }
}

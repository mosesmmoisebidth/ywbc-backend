import { randomInt } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/jwt.js';
import { ApiError } from '../lib/apiError.js';
import { logger } from '../lib/logger.js';
import { sendMail } from '../lib/mailer.js';
import {
  emailVerifiedTemplate,
  passwordResetTemplate,
  welcomeAndVerifyTemplate,
} from '../lib/emailTemplates.js';
import { env } from '../env.js';
import type {
  SignUpInput,
  SignInInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  UpdateProfileInput,
  SurveyAnswersInput,
  SendVerificationInput,
  VerifyEmailInput,
} from '../validators/auth.validator.js';
import type { User } from '../generated/prisma/client.js';

const sanitize = (user: User) => {
  const { passwordHash: _ph, ...rest } = user;
  return rest;
};

const sixDigitCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');

async function issueVerificationCode(user: User): Promise<string> {
  const code = sixDigitCode();
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);
  // Best-effort: invalidate any outstanding unused codes for this user so the
  // newest one is always the one that works.
  await prisma.emailVerification.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });
  await prisma.emailVerification.create({ data: { userId: user.id, code, expiresAt } });
  return code;
}

export async function signUp(input: SignUpInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw ApiError.conflict('That email is already registered.');

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      fullName: input.fullName,
      phone: input.phone,
      language: input.language ?? 'EN',
    },
  });

  // Send the welcome + verification email. Failures are swallowed inside the
  // mailer so sign-up always succeeds even if SMTP is down.
  try {
    const code = await issueVerificationCode(user);
    const tpl = welcomeAndVerifyTemplate({
      fullName: user.fullName,
      code,
      ttlMinutes: env.EMAIL_VERIFICATION_CODE_TTL_MINUTES,
    });
    await sendMail({ to: user.email, ...tpl });
  } catch (err) {
    logger.error({ err, userId: user.id }, 'verification email setup failed');
  }

  const token = signToken({ userId: user.id, role: user.role });
  return { user: sanitize(user), token };
}

export async function signIn(input: SignInInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  const generic = "That email or password didn't match.";
  if (!user) throw new ApiError(401, generic);

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new ApiError(401, generic);

  const token = signToken({ userId: user.id, role: user.role });
  return { user: sanitize(user), token };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("We couldn't find that account.");
  return sanitize(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({ where: { id: userId }, data: input });
  return sanitize(user);
}

export async function saveSurveyAnswers(userId: string, input: SurveyAnswersInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { surveyAnswers: input },
  });
  return sanitize(user);
}

export async function sendVerificationCode(input: SendVerificationInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  // Always respond the same way so we never leak which emails exist.
  if (!user) {
    return { message: "If that email is registered, a fresh code is on its way." };
  }
  if (user.emailVerified) {
    return { message: 'This email is already confirmed.' };
  }

  const code = await issueVerificationCode(user);
  const tpl = welcomeAndVerifyTemplate({
    fullName: user.fullName,
    code,
    ttlMinutes: env.EMAIL_VERIFICATION_CODE_TTL_MINUTES,
  });
  await sendMail({ to: user.email, ...tpl });

  return { message: 'A fresh code is on its way. Check your inbox gently.' };
}

export async function verifyEmail(input: VerifyEmailInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user) throw ApiError.badRequest("That code didn't match. Try again gently.");
  if (user.emailVerified) {
    return { user: sanitize(user), message: 'Your email is already confirmed.' };
  }

  const record = await prisma.emailVerification.findFirst({
    where: { userId: user.id, code: input.code, used: false },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) throw ApiError.badRequest("That code didn't match. Try again gently.");
  if (record.expiresAt < new Date()) {
    throw ApiError.badRequest('That code has expired. We can send you a fresh one.');
  }

  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } }),
    prisma.emailVerification.update({ where: { id: record.id }, data: { used: true } }),
  ]);

  try {
    const tpl = emailVerifiedTemplate({ fullName: updated.fullName });
    await sendMail({ to: updated.email, ...tpl });
  } catch (err) {
    logger.error({ err, userId: updated.id }, 'verified email send failed');
  }

  return { user: sanitize(updated), message: 'Your email is confirmed. Welcome.' };
}

export async function forgotPassword(input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  // Don't leak existence — same response either way.
  const fallback = { message: 'If that email is registered, a reset code is on its way.' };
  if (!user) return fallback;

  const code = sixDigitCode();
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000);
  await prisma.passwordReset.create({ data: { userId: user.id, token: code, expiresAt } });

  const tpl = passwordResetTemplate({
    fullName: user.fullName,
    code,
    ttlMinutes: env.PASSWORD_RESET_CODE_TTL_MINUTES,
  });
  await sendMail({ to: user.email, ...tpl });

  return fallback;
}

export async function resetPassword(input: ResetPasswordInput) {
  const reset = await prisma.passwordReset.findUnique({ where: { token: input.token } });
  if (!reset || reset.used || reset.expiresAt < new Date()) {
    throw ApiError.badRequest('That reset code has expired. Please request a new one.');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash: await hashPassword(input.password) },
    }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
  ]);

  return { message: 'Your password has been updated.' };
}

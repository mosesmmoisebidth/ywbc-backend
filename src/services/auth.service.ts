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
  RequestEmailChangeInput,
  ConfirmEmailChangeInput,
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

/**
 * Change-email flow. We email the verification code to the user's CURRENT
 * address (the security pattern called out in Section 11 of the brief): if
 * an attacker has access to a new mailbox but not the current one, they
 * can't hijack the account.
 *
 *   1. requestEmailChange(userId, { newEmail }) → generates a code, stores
 *      it against the user, emails it to the CURRENT address.
 *   2. confirmEmailChange(userId, { code }) → swaps user.email if the code
 *      matches and is unexpired. Marks the request consumed.
 */
export async function requestEmailChange(userId: string, input: RequestEmailChangeInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("We couldn't find that account.");

  const target = input.newEmail.toLowerCase().trim();
  if (target === user.email.toLowerCase()) {
    throw ApiError.badRequest('That is already your email.');
  }
  const taken = await prisma.user.findUnique({ where: { email: target } });
  if (taken) throw ApiError.badRequest('That email is already in use.');

  // Invalidate any older outstanding requests so the newest code is the
  // only one that works.
  await prisma.emailChangeRequest.updateMany({
    where: { userId, consumed: false },
    data: { consumed: true },
  });

  const code = sixDigitCode();
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);
  await prisma.emailChangeRequest.create({
    data: { userId, newEmail: target, code, expiresAt },
  });

  // Reuse the password-reset template structure — same shape (code + TTL
  // line) just with a different surrounding sentence. Falls back to the
  // verify template if you'd rather a dedicated copy later.
  const tpl = passwordResetTemplate({
    fullName: user.fullName,
    code,
    ttlMinutes: env.EMAIL_VERIFICATION_CODE_TTL_MINUTES,
  });
  await sendMail({
    to: user.email,
    subject: 'Confirm your email change · YWBC',
    html: tpl.html.replace(
      'reset your password',
      `confirm changing your email to ${target}`,
    ),
    text: tpl.text.replace(
      'reset your password',
      `confirm changing your email to ${target}`,
    ),
  });

  return { message: `A 6-digit code is on its way to ${user.email}.` };
}

export async function confirmEmailChange(userId: string, input: ConfirmEmailChangeInput) {
  const record = await prisma.emailChangeRequest.findFirst({
    where: { userId, code: input.code, consumed: false },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) throw ApiError.badRequest("That code didn't match. Try again gently.");
  if (record.expiresAt < new Date()) {
    throw ApiError.badRequest('That code has expired. Request a fresh one.');
  }

  // Race check: someone else may have grabbed the target email between
  // request and confirm.
  const taken = await prisma.user.findUnique({ where: { email: record.newEmail } });
  if (taken && taken.id !== userId) {
    throw ApiError.badRequest('That email is already in use.');
  }

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      // Treat the new email as unverified until the next sign-in re-verifies.
      data: { email: record.newEmail, emailVerified: false },
    }),
    prisma.emailChangeRequest.update({
      where: { id: record.id },
      data: { consumed: true },
    }),
  ]);

  return { user: sanitize(updated), message: 'Your email is updated.' };
}

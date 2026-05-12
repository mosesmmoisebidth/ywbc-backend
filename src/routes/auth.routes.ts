import { Hono } from 'hono';
import type { AppEnv } from '../types/hono.js';
import { ok } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  surveyAnswersSchema,
  sendVerificationSchema,
  verifyEmailSchema,
  type SignUpInput,
  type SignInInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type UpdateProfileInput,
  type SurveyAnswersInput,
  type SendVerificationInput,
  type VerifyEmailInput,
} from '../validators/auth.validator.js';
import * as authService from '../services/auth.service.js';
import { authLimiter, forgotPasswordLimiter } from '../middleware/rateLimit.middleware.js';

export const authRoutes = new Hono<AppEnv>();

authRoutes.post('/sign-up', authLimiter, validateBody(signUpSchema), async (c) => {
  const input = c.get('validated') as SignUpInput;
  const result = await authService.signUp(input);
  return c.json(ok(result, 'Welcome to Your Wellbeing Center.'), 201);
});

authRoutes.post('/sign-in', authLimiter, validateBody(signInSchema), async (c) => {
  const input = c.get('validated') as SignInInput;
  const result = await authService.signIn(input);
  return c.json(ok(result, 'Welcome back.'));
});

authRoutes.post('/forgot-password', forgotPasswordLimiter, validateBody(forgotPasswordSchema), async (c) => {
  const input = c.get('validated') as ForgotPasswordInput;
  const result = await authService.forgotPassword(input);
  return c.json(ok(null, result.message));
});

authRoutes.post('/reset-password', validateBody(resetPasswordSchema), async (c) => {
  const input = c.get('validated') as ResetPasswordInput;
  const result = await authService.resetPassword(input);
  return c.json(ok(null, result.message));
});

authRoutes.post('/send-verification', authLimiter, validateBody(sendVerificationSchema), async (c) => {
  const input = c.get('validated') as SendVerificationInput;
  const result = await authService.sendVerificationCode(input);
  return c.json(ok(null, result.message));
});

authRoutes.post('/verify-email', authLimiter, validateBody(verifyEmailSchema), async (c) => {
  const input = c.get('validated') as VerifyEmailInput;
  const result = await authService.verifyEmail(input);
  return c.json(ok(result.user, result.message));
});

authRoutes.get('/me', authMiddleware, async (c) => {
  const user = c.get('user')!;
  const data = await authService.getCurrentUser(user.id);
  return c.json(ok(data));
});

authRoutes.post('/sign-out', authMiddleware, (c) =>
  c.json(ok(null, 'Signed out. Take gentle care.')),
);

export const userRoutes = new Hono<AppEnv>();

userRoutes.patch('/me', authMiddleware, validateBody(updateProfileSchema), async (c) => {
  const user = c.get('user')!;
  const input = c.get('validated') as UpdateProfileInput;
  const data = await authService.updateProfile(user.id, input);
  return c.json(ok(data, 'Your profile has been updated.'));
});

userRoutes.patch('/me/survey', authMiddleware, validateBody(surveyAnswersSchema), async (c) => {
  const user = c.get('user')!;
  const input = c.get('validated') as SurveyAnswersInput;
  const data = await authService.saveSurveyAnswers(user.id, input);
  return c.json(ok(data, 'Thank you. We will hold this gently.'));
});

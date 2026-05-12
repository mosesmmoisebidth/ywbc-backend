import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password needs at least 8 characters'),
  fullName: z.string().min(2, 'Add your full name'),
  phone: z.string().min(7).max(20).optional(),
  language: z.enum(['EN', 'RW']).optional(),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(4, 'Reset code is invalid'),
  password: z.string().min(8, 'Password needs at least 8 characters'),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const sendVerificationSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});
export type SendVerificationInput = z.infer<typeof sendVerificationSchema>;

export const verifyEmailSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(7).max(20).optional(),
  photoURL: z.string().url().optional(),
  language: z.enum(['EN', 'RW']).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Survey answers — every field optional and free-form because we never want
// to reject a user submission and lose their input. The frontend defines the
// canonical option enums; the backend trusts them as opaque strings.
export const surveyAnswersSchema = z.object({
  focusAreas: z.array(z.string()).max(20).default([]),
  feelings: z.array(z.string()).max(30).default([]),
  duration: z.string().nullable().optional(),
  pace: z.string().nullable().optional(),
  support: z.string().nullable().optional(),
  sessionMode: z.string().nullable().optional(),
  contentInterests: z.array(z.string()).max(20).default([]),
  frequency: z.string().nullable().optional(),
  preferredTime: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  note: z.string().max(2000).default(''),
});
export type SurveyAnswersInput = z.infer<typeof surveyAnswersSchema>;

import { z } from 'zod';

const dayHours = z.array(
  z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  }),
);
const weeklySchedule = z.object({
  SUN: dayHours.optional(),
  MON: dayHours.optional(),
  TUE: dayHours.optional(),
  WED: dayHours.optional(),
  THU: dayHours.optional(),
  FRI: dayHours.optional(),
  SAT: dayHours.optional(),
});
const scheduleExceptions = z.array(
  z.object({ date: z.string(), available: z.boolean().optional() }),
);

export const therapistCreateSchema = z.object({
  fullName: z.string().min(2),
  title: z.string().min(2),
  photoURL: z.string().url(),
  bio: z.string().min(10),
  specialties: z.array(z.string()).min(1),
  languages: z.array(z.string()).min(1),
  credentials: z.array(z.string()).default([]),
  pricePerSession: z.number().int().positive(),
  pricingByType: z.object({
    online: z.number().int().nonnegative().optional(),
    inPerson: z.number().int().nonnegative().optional(),
    group: z.number().int().nonnegative().optional(),
  }),
  sessionTypes: z.array(z.enum(['ONLINE', 'IN_PERSON', 'GROUP'])).min(1),
  weeklySchedule: weeklySchedule.default({}),
  scheduleExceptions: scheduleExceptions.default([]),
  yearsExperience: z.number().int().nonnegative().default(0),
});
export type TherapistCreateInput = z.infer<typeof therapistCreateSchema>;
export const therapistUpdateSchema = therapistCreateSchema.partial();
export type TherapistUpdateInput = z.infer<typeof therapistUpdateSchema>;

export const therapistAvailabilitySchema = z.object({
  weeklySchedule: weeklySchedule.optional(),
  scheduleExceptions: scheduleExceptions.optional(),
});

export const sessionCreateSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  coverImageURL: z.string().url(),
  hostName: z.string().min(2),
  hostPhotoURL: z.string().url(),
  topic: z.string().min(2),
  dateTime: z.string().datetime(),
  duration: z.number().int().min(15).max(240),
  capacity: z.number().int().min(1).max(500),
  isFree: z.boolean().default(true),
  price: z.number().int().nonnegative().optional(),
  meetingLink: z.string().url().optional(),
  status: z.enum(['DRAFT', 'UPCOMING', 'LIVE', 'PAST', 'CANCELLED']).default('DRAFT'),
  isRecurring: z.boolean().default(false),
  recurrence: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
});
export type SessionCreateInput = z.infer<typeof sessionCreateSchema>;
export const sessionUpdateSchema = sessionCreateSchema.partial();

export const broadcastSchema = z.object({
  subject: z.string().min(2),
  body: z.string().min(2),
});
export type BroadcastInput = z.infer<typeof broadcastSchema>;

export const cancelSessionSchema = z.object({ reason: z.string().min(2).max(300) });

export const articleCreateSchema = z.object({
  title: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug uses lowercase letters, numbers, and hyphens.').optional(),
  excerpt: z.string().min(10),
  content: z.string().min(10),
  coverImageURL: z.string().url(),
  author: z.string().min(2),
  category: z.string().min(2),
  tags: z.array(z.string()).default([]),
  readingTime: z.number().int().min(1).max(120).optional(),
});
export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
export const articleUpdateSchema = articleCreateSchema.partial();

export const articleScheduleSchema = z.object({
  publishAt: z.string().datetime(),
});

export const quoteSchema = z.object({
  text: z.string().min(5),
  author: z.string().min(2).default('Dr. Brave Olivier'),
  category: z.enum(['WELLNESS', 'NUTRITION', 'MOTIVATION', 'RECONCILIATION']),
  isActive: z.boolean().default(true),
  scheduledFor: z.string().datetime().optional(),
});
export const quoteUpdateSchema = quoteSchema.partial();

export const faqSchema = z.object({
  question: z.string().min(5),
  answer: z.string().min(5),
  category: z.enum(['GENERAL', 'THERAPY', 'NUTRITION', 'BOOKING']),
  followUpActions: z
    .array(z.object({ label: z.string(), type: z.string(), payload: z.unknown().optional() }))
    .optional(),
  relatedFaqIds: z.array(z.string()).default([]),
  order: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});
export const faqUpdateSchema = faqSchema.partial();
export const faqReorderSchema = z.object({ ids: z.array(z.string()).min(1) });

export const meditationSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  audioURL: z.string().url(),
  duration: z.number().int().positive(),
  coverImageURL: z.string().url(),
  category: z.enum(['SLEEP', 'ANXIETY', 'FOCUS', 'BREATHING', 'BODY_SCAN']),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).default('DRAFT'),
});
export const meditationUpdateSchema = meditationSchema.partial();

export const nutritionTipSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  icon: z.string().min(1),
  category: z.string().min(1),
  isActive: z.boolean().default(true),
});
export const nutritionTipUpdateSchema = nutritionTipSchema.partial();

export const mealPlanSchema = z.object({
  title: z.string().min(2),
  coverImageURL: z.string().url(),
  goal: z.string().min(2),
  durationDays: z.number().int().min(1).max(60),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).default('DRAFT'),
  days: z
    .array(
      z.object({
        dayNumber: z.number().int().positive(),
        meals: z.array(
          z.object({
            slot: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
            title: z.string().min(2),
            photoURL: z.string().url().optional(),
            ingredients: z.array(z.string()).default([]),
            instructions: z.string().optional(),
          }),
        ),
      }),
    )
    .default([]),
});
export const mealPlanUpdateSchema = mealPlanSchema.partial();

export const approvePaymentSchema = z.object({ note: z.string().max(500).optional() });
export const rejectPaymentSchema = z.object({ reason: z.string().min(2).max(500) });

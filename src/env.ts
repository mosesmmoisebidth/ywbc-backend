import { config } from 'dotenv';
config({ override: true });
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  CORS_ORIGIN: z.string().default('http://localhost:8081'),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Cloudflare R2 (audio storage). All required as a set; the lib short-
  // circuits with a friendly error if any are missing.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),

  // SMTP — when EMAIL_HOST_USER + EMAIL_HOST_PASSWORD are present the mailer
  // delivers real emails via Gmail. Otherwise it falls back to a console log
  // so local dev never blocks on missing credentials.
  EMAIL_HOST: z.string().default('smtp.gmail.com'),
  EMAIL_PORT: z.coerce.number().int().positive().default(587),
  EMAIL_HOST_USER: z.string().optional(),
  EMAIL_HOST_PASSWORD: z.string().optional(),
  DEFAULT_FROM_EMAIL: z.string().optional(),
  EMAIL_FROM_NAME: z.string().default('Your Wellbeing Center'),

  EMAIL_VERIFICATION_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  EMAIL_VERIFICATION_WINDOW_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(15),

  RESEND_API_KEY: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`\n[env] Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

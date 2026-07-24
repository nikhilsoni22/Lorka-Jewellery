import 'dotenv/config';
import { z } from 'zod';

const csv = (value: string) =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  REFRESH_TOKEN_REMEMBER_TTL_DAYS: z.coerce.number().int().positive().default(30),
  RESET_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(30),
  EMAIL_OTP_TTL_MIN: z.coerce.number().int().positive().default(10),

  // Must list BOTH the website's and the admin panel's exact production origins (comma-separated,
  // no trailing slash), or the browser will block every request from them.
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform(csv),
  WEBSITE_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_URL: z.string().url().default('http://localhost:3001'),
  // Leave unset if the API, website, and admin panel are on unrelated domains (e.g. an
  // onrender.com/vercel.app default) — the refresh cookie then only works via direct
  // fetch/axios calls to the API's own origin, and browsers that block third-party cookies
  // (Safari always; Chrome increasingly) will eventually break session persistence.
  // Set to the shared parent domain (e.g. ".lorkajewellers.com") once the API and both
  // frontends are deployed as subdomains of the SAME custom domain — that makes the cookie a
  // proper first-party cookie shared across all three, immune to third-party cookie blocking.
  COOKIE_DOMAIN: z.string().optional().transform((v) => (v ? v : undefined)),

  SEED_ADMIN_NAME: z.string().default('Super Admin'),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),

  // Legacy: only used to seed the DB-backed setting the first time it's created. Razorpay keys
  // are now managed from Admin → Settings, not .env — see settings.repository.ts.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // Product/banner images are uploaded straight to Cloudinary so they survive host restarts and
  // redeploys — the API's own disk is ephemeral on most hosts (Render included).
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  // Gmail SMTP — leave unset in dev to fall back to logging emails to the console. Trimmed
  // because a stray trailing space (easy to pick up when pasting a Gmail App Password) makes
  // Gmail silently reject auth — the failure otherwise looks identical to "not configured".
  SMTP_HOST: z.string().trim().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASS: z.string().trim().optional(),
  EMAIL_FROM: z.string().trim().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

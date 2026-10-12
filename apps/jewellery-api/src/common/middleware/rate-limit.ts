import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';

export const INTERNAL_KEY_HEADER = 'x-internal-key';

/**
 * True for server-side fetches from our own website (its server renders pages for every visitor
 * from a handful of shared hosting IPs, so per-IP limits would throttle the whole site at once).
 */
export function isInternalRequest(req: Request): boolean {
  const expected = env.INTERNAL_API_KEY;
  const provided = req.get(INTERNAL_KEY_HEADER);
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Generous global limiter applied to the whole API. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  skip: isInternalRequest,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
});

/** Strict limiter for auth-sensitive routes (login, refresh, password reset). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.', code: 'RATE_LIMITED' },
});

/** Guest checkout — public, no auth, so rate-limited on its own to curb abuse/bot spam. */
export const orderCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many orders placed, please try again later.', code: 'RATE_LIMITED' },
});

/** Public order-tracking lookup — rate-limited to blunt phone-number guessing. */
export const orderTrackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.', code: 'RATE_LIMITED' },
});

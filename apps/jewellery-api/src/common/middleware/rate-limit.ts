import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';

export const INTERNAL_KEY_HEADER = 'x-internal-key';
/** Real visitor IP, set by the website when it relays a browser's request (see its auth proxy). */
export const CLIENT_IP_HEADER = 'x-client-ip';

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

/** IP the website relayed on a visitor's behalf — only trusted alongside a valid internal key. */
function relayedClientIp(req: Request): string | undefined {
  const ip = req.get(CLIENT_IP_HEADER)?.trim();
  return ip && isInternalRequest(req) ? ip : undefined;
}

/**
 * Requests the website relays for a visitor (auth calls go through its own domain so the session
 * cookie is first-party) all arrive from the host's IPs, so limit by the visitor's IP instead.
 */
const keyGenerator = (req: Request): string => relayedClientIp(req) ?? req.ip ?? 'unknown';

/** Generous global limiter applied to the whole API. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  // Skip the website's own page-render fetches, but still count requests it relays for a visitor.
  skip: (req) => isInternalRequest(req) && !req.get(CLIENT_IP_HEADER),
  keyGenerator,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
});

/** Strict limiter for auth-sensitive routes (login, refresh, password reset). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.', code: 'RATE_LIMITED' },
});

/** Guest checkout — public, no auth, so rate-limited on its own to curb abuse/bot spam. */
export const orderCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many orders placed, please try again later.', code: 'RATE_LIMITED' },
});

/** Public coupon check — rate-limited so codes can't be guessed by brute force. */
export const couponCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.', code: 'RATE_LIMITED' },
});

/** Customer review posts and review-photo uploads. */
export const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.', code: 'RATE_LIMITED' },
});

/** Public order-tracking lookup — rate-limited to blunt phone-number guessing. */
export const orderTrackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.', code: 'RATE_LIMITED' },
});

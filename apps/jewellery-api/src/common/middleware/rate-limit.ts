import rateLimit from 'express-rate-limit';

/** Generous global limiter applied to the whole API. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
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

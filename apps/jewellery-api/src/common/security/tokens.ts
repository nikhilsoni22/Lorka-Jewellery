import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@lorka/types';
import { env } from '../../config/env';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m`,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded === 'string' || !decoded.sub || !('role' in decoded)) {
    throw new Error('Invalid access token payload');
  }
  return { sub: String(decoded.sub), role: decoded.role as UserRole };
}

export const accessTokenTtlSeconds = env.ACCESS_TOKEN_TTL_MIN * 60;

/** Generates a high-entropy opaque refresh token (the raw value handed to the client). */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/** One-way hash used to store opaque tokens (refresh / reset) at rest. */
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function generateResetToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
}

/** 6-digit numeric code for email verification, hashed the same way as other tokens at rest. */
export function generateOtp(): { code: string; hash: string } {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  return { code, hash: hashToken(code) };
}

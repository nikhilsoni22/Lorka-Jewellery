import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@lorka/types';
import { AppError } from '../errors/app-error';
import { verifyAccessToken } from '../security/tokens';

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Requires a valid access token; attaches `req.user`. */
export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearer(req);
  if (!token) {
    next(AppError.unauthorized('Authentication required'));
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired token'));
  }
}

/** Attaches `req.user` if a valid Bearer token is present, but never rejects the request. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearer(req);
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // Ignore invalid/expired tokens — the request proceeds unauthenticated.
  }
  next();
}

/** Requires an authenticated user whose role is in the allowed set. */
export function roleGuard(...allowed: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized('Authentication required'));
      return;
    }
    if (!allowed.includes(req.user.role)) {
      next(AppError.forbidden('You do not have permission to access this resource'));
      return;
    }
    next();
  };
}

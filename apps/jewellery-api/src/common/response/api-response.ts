import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { PaginationMeta } from '@lorka/types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  status = 200,
  message?: string,
  meta?: PaginationMeta,
): void {
  res.status(status).json({ success: true, data, ...(message ? { message } : {}), ...(meta ? { meta } : {}) });
}

/**
 * Wraps an async route handler so thrown/rejected errors are forwarded to the
 * central error handler instead of crashing the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

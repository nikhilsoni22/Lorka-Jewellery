import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import type { ApiError } from '@lorka/types';
import { AppError } from '../errors/app-error';
import { logger } from '../logger/logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  const payload: ApiError = { success: false, message: 'Internal server error', code: 'INTERNAL' };

  if (err instanceof AppError) {
    status = err.statusCode;
    payload.message = err.message;
    payload.code = err.code;
    if (err.errors) payload.errors = err.errors;
  } else if (err instanceof ZodError) {
    status = 400;
    payload.message = 'Validation failed';
    payload.code = 'BAD_REQUEST';
    payload.errors = err.issues.reduce<Record<string, string[]>>((acc, i) => {
      const key = i.path.join('.') || '_';
      (acc[key] ??= []).push(i.message);
      return acc;
    }, {});
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    payload.message = 'Validation failed';
    payload.code = 'BAD_REQUEST';
  } else if (isDuplicateKeyError(err)) {
    status = 409;
    payload.message = 'Resource already exists';
    payload.code = 'CONFLICT';
  }

  if (status >= 500) {
    logger.error({ err, path: req.originalUrl }, 'Unhandled error');
  }

  res.status(status).json(payload);
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

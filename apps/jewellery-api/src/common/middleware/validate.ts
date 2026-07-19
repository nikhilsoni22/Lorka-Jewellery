import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { AppError } from '../errors/app-error';

type Source = 'body' | 'query' | 'params';

/** Validates and replaces the given request part with the parsed (typed) value. */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      // Query/params are read-only getters in Express 5; body is safe to overwrite.
      if (source === 'body') {
        req.body = parsed;
      } else {
        Object.defineProperty(req, source, { value: parsed, configurable: true });
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const key = issue.path.join('.') || '_';
          (errors[key] ??= []).push(issue.message);
        }
        next(AppError.badRequest('Validation failed', errors));
        return;
      }
      next(err);
    }
  };
}

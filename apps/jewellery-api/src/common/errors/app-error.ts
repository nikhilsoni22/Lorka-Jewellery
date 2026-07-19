export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly errors?: Record<string, string[]>;
  readonly isOperational = true;

  constructor(
    statusCode: number,
    message: string,
    code = 'ERROR',
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    Error.captureStackTrace?.(this, new.target);
  }

  static badRequest(message = 'Bad request', errors?: Record<string, string[]>) {
    return new AppError(400, message, 'BAD_REQUEST', errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(403, message, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, message, 'NOT_FOUND');
  }

  static conflict(message = 'Resource already exists') {
    return new AppError(409, message, 'CONFLICT');
  }

  static tooMany(message = 'Too many requests') {
    return new AppError(429, message, 'RATE_LIMITED');
  }

  static notImplemented(message = 'Not implemented') {
    return new AppError(501, message, 'NOT_IMPLEMENTED');
  }

  static internal(message = 'Internal server error') {
    return new AppError(500, message, 'INTERNAL');
  }
}

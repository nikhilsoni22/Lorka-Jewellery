import { Router } from 'express';
import {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
  verifyEmailOtpSchema,
} from '@lorka/types';
import { validate } from '../../common/middleware/validate';
import { authGuard } from '../../common/middleware/auth';
import { authLimiter } from '../../common/middleware/rate-limit';
import { asyncHandler } from '../../common/response/api-response';
import type { AuthController } from './auth.controller';

export function createAuthRouter(c: AuthController): Router {
  const router = Router();

  router.post('/register', authLimiter, validate(registerSchema), asyncHandler(c.register));
  router.post('/login', authLimiter, validate(loginSchema), asyncHandler(c.login));
  router.post('/admin/login', authLimiter, validate(adminLoginSchema), asyncHandler(c.adminLogin));
  router.post('/refresh', authLimiter, validate(refreshSchema), asyncHandler(c.refresh));
  router.post('/logout', asyncHandler(c.logout));
  router.get('/me', authGuard, asyncHandler(c.me));
  router.post(
    '/forgot-password',
    authLimiter,
    validate(forgotPasswordSchema),
    asyncHandler(c.forgotPassword),
  );
  router.post(
    '/reset-password',
    authLimiter,
    validate(resetPasswordSchema),
    asyncHandler(c.resetPassword),
  );
  router.post(
    '/verify-email/otp',
    authGuard,
    authLimiter,
    validate(verifyEmailOtpSchema),
    asyncHandler(c.verifyEmailOtp),
  );
  router.post('/verify-email/resend', authGuard, authLimiter, asyncHandler(c.resendEmailOtp));

  // Deferred providers — respond 501 until credentials are configured.
  router.post('/google', asyncHandler(c.googleStub));
  router.post('/otp/request', asyncHandler(c.otpRequestStub));
  router.post('/otp/verify', asyncHandler(c.otpVerifyStub));

  return router;
}

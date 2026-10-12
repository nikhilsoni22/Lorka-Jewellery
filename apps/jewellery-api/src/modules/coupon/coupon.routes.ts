import { Router } from 'express';
import { createCouponSchema, updateCouponSchema, validateCouponSchema, UserRole } from '@lorka/types';
import { validate } from '../../common/middleware/validate';
import { authGuard, roleGuard } from '../../common/middleware/auth';
import { couponCheckLimiter } from '../../common/middleware/rate-limit';
import { asyncHandler } from '../../common/response/api-response';
import type { CouponController } from './coupon.controller';

export function createCouponRouter(c: CouponController): Router {
  const router = Router();
  const adminOnly = [authGuard, roleGuard(UserRole.Admin, UserRole.SuperAdmin)];

  // Public — the checkout page checks a code before the order is placed.
  router.post('/validate', couponCheckLimiter, validate(validateCouponSchema), asyncHandler(c.validate));

  // Admin
  router.get('/', ...adminOnly, asyncHandler(c.list));
  router.post('/', ...adminOnly, validate(createCouponSchema), asyncHandler(c.create));
  router.put('/:id', ...adminOnly, validate(updateCouponSchema), asyncHandler(c.update));
  router.delete('/:id', ...adminOnly, asyncHandler(c.delete));

  return router;
}

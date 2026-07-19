import { Router } from 'express';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  setBuildEtaSchema,
  orderQuerySchema,
  trackOrderQuerySchema,
  UserRole,
} from '@lorka/types';
import { validate } from '../../common/middleware/validate';
import { authGuard, roleGuard, optionalAuth } from '../../common/middleware/auth';
import { orderCreateLimiter, orderTrackLimiter } from '../../common/middleware/rate-limit';
import { asyncHandler } from '../../common/response/api-response';
import type { OrderController } from './order.controller';

export function createOrderRouter(c: OrderController): Router {
  const router = Router();
  const adminOnly = [authGuard, roleGuard(UserRole.Admin, UserRole.SuperAdmin)];

  // Public/customer — must be registered before the admin `/:id` route so
  // Express doesn't swallow these as an `:id` param.
  router.get('/track', orderTrackLimiter, validate(trackOrderQuerySchema, 'query'), asyncHandler(c.track));
  router.get('/mine', authGuard, validate(orderQuerySchema, 'query'), asyncHandler(c.mine));
  router.post(
    '/',
    optionalAuth,
    orderCreateLimiter,
    validate(createOrderSchema),
    asyncHandler(c.create),
  );

  // Admin
  router.get('/', ...adminOnly, validate(orderQuerySchema, 'query'), asyncHandler(c.list));
  router.get('/:id', ...adminOnly, asyncHandler(c.getById));
  router.patch('/:id/status', ...adminOnly, validate(updateOrderStatusSchema), asyncHandler(c.updateStatus));
  router.patch('/:id/build-eta', ...adminOnly, validate(setBuildEtaSchema), asyncHandler(c.setBuildEta));

  return router;
}

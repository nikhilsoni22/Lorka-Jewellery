import { Router } from 'express';
import { createRazorpayOrderSchema } from '@lorka/types';
import { validate } from '../../common/middleware/validate';
import { optionalAuth } from '../../common/middleware/auth';
import { orderCreateLimiter } from '../../common/middleware/rate-limit';
import { asyncHandler } from '../../common/response/api-response';
import type { PaymentController } from './payment.controller';

export function createPaymentRouter(c: PaymentController): Router {
  const router = Router();

  router.post(
    '/razorpay/order',
    optionalAuth,
    orderCreateLimiter,
    validate(createRazorpayOrderSchema),
    asyncHandler(c.createRazorpayOrder),
  );

  return router;
}

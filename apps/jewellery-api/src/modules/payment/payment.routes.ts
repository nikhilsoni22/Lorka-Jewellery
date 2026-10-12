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

  // Called by Razorpay's servers, authenticated by the X-Razorpay-Signature header (see
  // PaymentService.handleWebhook). Set this URL in Razorpay Dashboard → Webhooks.
  router.post('/razorpay/webhook', asyncHandler(c.razorpayWebhook));

  return router;
}

import { Router } from 'express';
import { isDatabaseConnected } from '../config/db';
import { sendSuccess } from '../common/response/api-response';
import { createAuthRouter } from '../modules/auth/auth.routes';
import { createCategoryRouter } from '../modules/category/category.routes';
import { createProductRouter } from '../modules/product/product.routes';
import { createBannerRouter } from '../modules/banner/banner.routes';
import { createUploadRouter } from '../modules/upload/upload.routes';
import { createOrderRouter } from '../modules/order/order.routes';
import { createPaymentRouter } from '../modules/payment/payment.routes';
import { createUserRouter } from '../modules/users/user.routes';
import { createTicketRouter } from '../modules/ticket/ticket.routes';
import { createSettingsRouter } from '../modules/settings/settings.routes';
import type { AppContainer } from '../container/container';

export function createApiRouter(container: AppContainer): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    sendSuccess(res, {
      status: 'ok',
      service: 'jewellery-api',
      db: isDatabaseConnected() ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  router.use('/auth', createAuthRouter(container.authController));
  router.use('/categories', createCategoryRouter(container.categoryController));
  router.use('/products', createProductRouter(container.productController));
  router.use('/banners', createBannerRouter(container.bannerController));
  router.use('/uploads', createUploadRouter(container.uploadController));
  router.use('/orders', createOrderRouter(container.orderController));
  router.use('/payments', createPaymentRouter(container.paymentController));
  router.use('/users', createUserRouter(container.userController));
  router.use('/tickets', createTicketRouter(container.ticketController));
  router.use('/settings', createSettingsRouter(container.settingsController));

  return router;
}

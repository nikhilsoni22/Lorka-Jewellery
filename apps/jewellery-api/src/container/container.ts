import { UserRepository } from '../modules/users/user.repository';
import { UserService } from '../modules/users/user.service';
import { UserController } from '../modules/users/user.controller';
import { RefreshTokenRepository } from '../modules/tokens/refresh-token.repository';
import { AuditLogRepository } from '../modules/audit/audit-log.repository';
import { AuditLogService } from '../modules/audit/audit-log.service';
import { ConsoleEmailService } from '../notifications/console-email.service';
import { SmtpEmailService } from '../notifications/smtp-email.service';
import { ResendEmailService } from '../notifications/resend-email.service';
import { env, isProd } from '../config/env';
import { logger } from '../common/logger/logger';
import type { IEmailService } from '../common/interfaces/services';
import { AuthService } from '../modules/auth/auth.service';
import { AuthController } from '../modules/auth/auth.controller';
import { CategoryRepository } from '../modules/category/category.repository';
import { CategoryService } from '../modules/category/category.service';
import { CategoryController } from '../modules/category/category.controller';
import { ProductRepository } from '../modules/product/product.repository';
import { ProductService } from '../modules/product/product.service';
import { ProductController } from '../modules/product/product.controller';
import { BannerRepository } from '../modules/banner/banner.repository';
import { BannerService } from '../modules/banner/banner.service';
import { BannerController } from '../modules/banner/banner.controller';
import { UploadController } from '../modules/upload/upload.controller';
import { OrderRepository } from '../modules/order/order.repository';
import { OrderService } from '../modules/order/order.service';
import { OrderController } from '../modules/order/order.controller';
import { PaymentService } from '../modules/payment/payment.service';
import { PaymentController } from '../modules/payment/payment.controller';
import { TicketRepository } from '../modules/ticket/ticket.repository';
import { TicketService } from '../modules/ticket/ticket.service';
import { TicketController } from '../modules/ticket/ticket.controller';
import { SettingsRepository } from '../modules/settings/settings.repository';
import { SettingsService } from '../modules/settings/settings.service';
import { SettingsController } from '../modules/settings/settings.controller';

/**
 * Composition root. Constructor injection wires concrete implementations to the
 * interfaces each service depends on (DIP) — no decorator/reflection magic, so it
 * runs identically under tsx, tsup, and Vitest. Swap an implementation here (e.g. a
 * real EmailService) without touching the consumers.
 */
export interface AppContainer {
  authController: AuthController;
  authService: AuthService;
  userService: UserService;
  categoryController: CategoryController;
  productController: ProductController;
  bannerController: BannerController;
  uploadController: UploadController;
  orderController: OrderController;
  paymentController: PaymentController;
  userController: UserController;
  ticketController: TicketController;
  settingsController: SettingsController;
}

export function buildContainer(): AppContainer {
  // Repositories (persistence layer)
  const userRepository = new UserRepository();
  const refreshTokenRepository = new RefreshTokenRepository();
  const auditLogRepository = new AuditLogRepository();
  const categoryRepository = new CategoryRepository();
  const productRepository = new ProductRepository();
  const bannerRepository = new BannerRepository();
  const orderRepository = new OrderRepository();
  const ticketRepository = new TicketRepository();
  const settingsRepository = new SettingsRepository();

  // Infrastructure services
  // Resend (HTTPS API) takes priority — SMTP ports are commonly blocked outbound on hosts like
  // Render, so RESEND_API_KEY is the one that actually works in production there.
  let emailService: IEmailService;
  if (env.RESEND_API_KEY) {
    emailService = new ResendEmailService();
  } else if (env.SMTP_USER && env.SMTP_PASS) {
    emailService = new SmtpEmailService();
  } else {
    // Not throwing: a missing mailer shouldn't take down order/checkout flows, but this must
    // never fail silently — ConsoleEmailService only logs, it never actually sends anything.
    if (isProd) {
      logger.warn(
        'Neither RESEND_API_KEY nor SMTP_USER/SMTP_PASS are set — running with ' +
          'ConsoleEmailService in production, so password reset, OTP, and order emails will ' +
          'NOT be delivered. Set them on the host (e.g. Render → Environment), not just in the ' +
          'local .env file.',
      );
    }
    emailService = new ConsoleEmailService();
  }
  const auditLogService = new AuditLogService(auditLogRepository);

  // Domain services
  const userService = new UserService(userRepository);
  const authService = new AuthService(
    userRepository,
    refreshTokenRepository,
    emailService,
    auditLogService,
  );
  const categoryService = new CategoryService(categoryRepository);
  const productService = new ProductService(productRepository, categoryRepository, settingsRepository);
  const bannerService = new BannerService(bannerRepository);
  const orderService = new OrderService(
    orderRepository,
    productRepository,
    userRepository,
    emailService,
    settingsRepository,
  );
  const paymentService = new PaymentService(productRepository, settingsRepository);
  const ticketService = new TicketService(ticketRepository, userRepository);
  const settingsService = new SettingsService(settingsRepository);

  // Controllers
  const authController = new AuthController(authService, userService);
  const categoryController = new CategoryController(categoryService);
  const productController = new ProductController(productService);
  const bannerController = new BannerController(bannerService);
  const uploadController = new UploadController();
  const orderController = new OrderController(orderService);
  const paymentController = new PaymentController(paymentService);
  const userController = new UserController(userService);
  const ticketController = new TicketController(ticketService);
  const settingsController = new SettingsController(settingsService);

  return {
    authController,
    authService,
    userService,
    categoryController,
    productController,
    bannerController,
    uploadController,
    orderController,
    paymentController,
    userController,
    ticketController,
    settingsController,
  };
}

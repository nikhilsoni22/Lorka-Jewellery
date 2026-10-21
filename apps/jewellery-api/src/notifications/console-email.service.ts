import type { OrderResponse } from '@lorka/types';
import type { AdminPaymentAlert, AdminTicketNotification, IEmailService } from '../common/interfaces/services';
import { logger } from '../common/logger/logger';

/**
 * Development email transport: logs the message instead of sending it.
 * Used when SMTP_USER/SMTP_PASS aren't configured — see {@link SmtpEmailService}
 * for the real Gmail transport.
 */
export class ConsoleEmailService implements IEmailService {
  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    logger.info({ to, resetUrl }, '[email] Password reset link (dev — not actually sent)');
  }

  async sendOrderConfirmation(to: string, order: OrderResponse): Promise<void> {
    logger.info(
      { to, orderNumber: order.orderNumber, total: order.total },
      '[email] Order confirmation + invoice (dev — not actually sent)',
    );
  }

  async sendEmailVerificationOtp(to: string, otp: string): Promise<void> {
    logger.info({ to, otp }, '[email] Email verification OTP (dev — not actually sent)');
  }

  async sendBuildEtaUpdate(to: string, order: OrderResponse): Promise<void> {
    logger.info(
      { to, orderNumber: order.orderNumber, estimatedReadyDate: order.estimatedReadyDate },
      '[email] Build timeline update (dev — not actually sent)',
    );
  }

  async sendAdminOrderNotification(to: string, order: OrderResponse): Promise<void> {
    logger.info(
      { to, orderNumber: order.orderNumber, total: order.total },
      '[email] Admin order notification (dev — not actually sent)',
    );
  }

  async sendOrderStatusUpdate(to: string, order: OrderResponse): Promise<void> {
    logger.info(
      { to, orderNumber: order.orderNumber, status: order.status },
      '[email] Order status update (dev — not actually sent)',
    );
  }

  async sendAdminTicketNotification(to: string, data: AdminTicketNotification): Promise<void> {
    logger.info(
      {
        to,
        subject: data.ticket.subject,
        customer: data.ticket.customerName,
        phone: data.customerPhone,
        latestOrderNumber: data.latestOrderNumber,
      },
      '[email] Admin ticket notification (dev — not actually sent)',
    );
  }

  async sendAdminPaymentAlert(to: string, data: AdminPaymentAlert): Promise<void> {
    logger.warn({ to, ...data }, '[email] Admin payment alert (dev — not actually sent)');
  }

  async sendAdminUpiPaymentSubmitted(to: string, order: OrderResponse): Promise<void> {
    logger.info(
      { to, orderNumber: order.orderNumber, total: order.total, upiReference: order.upiReference },
      '[email] Admin UPI payment to verify (dev — not actually sent)',
    );
  }

  async sendPaymentVerified(to: string, order: OrderResponse): Promise<void> {
    logger.info({ to, orderNumber: order.orderNumber }, '[email] Payment verified (dev — not actually sent)');
  }

  async sendPaymentRejected(to: string, order: OrderResponse, reason: string): Promise<void> {
    logger.info({ to, orderNumber: order.orderNumber, reason }, '[email] Payment rejected (dev — not actually sent)');
  }

  async sendUnpaidOrderCancelled(to: string, order: OrderResponse): Promise<void> {
    logger.info({ to, orderNumber: order.orderNumber }, '[email] Unpaid UPI order cancelled (dev — not actually sent)');
  }
}

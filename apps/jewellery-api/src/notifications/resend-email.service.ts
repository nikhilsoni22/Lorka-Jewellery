import type { OrderResponse } from '@lorka/types';
import type { IEmailService } from '../common/interfaces/services';
import { env } from '../config/env';
import { logger } from '../common/logger/logger';
import {
  passwordResetEmail,
  emailVerificationOtpEmail,
  orderConfirmationEmail,
  buildEtaUpdateEmail,
  adminOrderNotificationEmail,
  orderStatusUpdateEmail,
} from './email-templates';

/** Sends email over Resend's HTTPS API instead of raw SMTP sockets — outbound HTTPS (443) works
 * on every host, unlike SMTP ports (25/465/587), which Render and several other PaaS block on
 * their lower tiers. Used when RESEND_API_KEY is configured; see container.ts for the choice
 * between this, SmtpEmailService, and ConsoleEmailService. */
export class ResendEmailService implements IEmailService {
  private readonly from: string;

  constructor() {
    this.from = env.EMAIL_FROM || 'Lorka Jewellers <onboarding@resend.dev>';
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const { subject, html } = passwordResetEmail(resetUrl);
    await this.send(to, subject, html);
  }

  async sendOrderConfirmation(to: string, order: OrderResponse): Promise<void> {
    const { subject, html } = orderConfirmationEmail(order);
    await this.send(to, subject, html);
  }

  async sendEmailVerificationOtp(to: string, otp: string): Promise<void> {
    const { subject, html } = emailVerificationOtpEmail(otp);
    await this.send(to, subject, html);
  }

  async sendBuildEtaUpdate(to: string, order: OrderResponse): Promise<void> {
    const { subject, html } = buildEtaUpdateEmail(order);
    await this.send(to, subject, html);
  }

  async sendAdminOrderNotification(to: string, order: OrderResponse): Promise<void> {
    const { subject, html } = adminOrderNotificationEmail(order);
    await this.send(to, subject, html);
  }

  async sendOrderStatusUpdate(to: string, order: OrderResponse): Promise<void> {
    const { subject, html } = orderStatusUpdateEmail(order);
    await this.send(to, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, to, subject, html }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        logger.error({ status: res.status, body, to, subject }, '[email] Resend API returned an error');
      }
    } catch (err) {
      logger.error({ err, to, subject }, '[email] Failed to send email via Resend');
    }
  }
}

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

/** Sends email over Brevo's HTTPS API (port 443, never blocked by hosts like Render). Brevo only
 * needs a verified single sender address (e.g. a Gmail) — no custom domain required. Used when
 * BREVO_API_KEY is configured; see container.ts for the choice between this, ResendEmailService,
 * SmtpEmailService, and ConsoleEmailService. EMAIL_FROM must be the sender verified in Brevo. */
export class BrevoEmailService implements IEmailService {
  private readonly sender: { name?: string; email: string };

  constructor() {
    // EMAIL_FROM is "Display Name <address@x.com>" or a bare address.
    const raw = env.EMAIL_FROM || '';
    const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    this.sender =
      m && m[2]
        ? { name: (m[1] ?? '').replace(/^"|"$/g, '') || undefined, email: m[2].trim() }
        : { email: raw.trim() };
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
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': env.BREVO_API_KEY!,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: this.sender,
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        logger.error({ status: res.status, body, to, subject }, '[email] Brevo API returned an error');
      }
    } catch (err) {
      logger.error({ err, to, subject }, '[email] Failed to send email via Brevo');
    }
  }
}

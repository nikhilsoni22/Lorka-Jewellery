import nodemailer, { type Transporter } from 'nodemailer';
import type { OrderResponse } from '@lorka/types';
import type { AdminPaymentAlert, AdminTicketNotification, IEmailService } from '../common/interfaces/services';
import { env } from '../config/env';
import { logger } from '../common/logger/logger';
import {
  passwordResetEmail,
  emailVerificationOtpEmail,
  orderConfirmationEmail,
  buildEtaUpdateEmail,
  adminOrderNotificationEmail,
  orderStatusUpdateEmail,
  adminTicketNotificationEmail,
  adminPaymentAlertEmail,
} from './email-templates';

/** Raw Gmail/SMTP transport, used when SMTP_USER/SMTP_PASS are configured. Note: most PaaS
 * (Render included) block outbound SMTP ports on lower tiers — if sends fail with ETIMEDOUT,
 * that's the platform, not these credentials. Prefer ResendEmailService in that case. */
export class SmtpEmailService implements IEmailService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      // nodemailer's defaults (2 min connection/socket timeout) make a blocked/unreachable SMTP
      // port fail slowly instead of fast — every caller here already treats send failures as
      // best-effort, so failing in ~10s instead of ~2min matters even though nothing awaits it
      // directly anymore.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });
    this.from = env.EMAIL_FROM || env.SMTP_USER!;
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

  async sendAdminTicketNotification(to: string, data: AdminTicketNotification): Promise<void> {
    const { subject, html } = adminTicketNotificationEmail(data);
    await this.send(to, subject, html);
  }

  async sendAdminPaymentAlert(to: string, data: AdminPaymentAlert): Promise<void> {
    const { subject, html } = adminPaymentAlertEmail(data);
    await this.send(to, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      logger.error({ err, to, subject }, '[email] Failed to send email via SMTP');
    }
  }
}

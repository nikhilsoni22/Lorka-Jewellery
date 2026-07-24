import nodemailer, { type Transporter } from 'nodemailer';
import { OrderStatus, type OrderResponse } from '@lorka/types';
import type { IEmailService } from '../common/interfaces/services';
import { env } from '../config/env';
import { logger } from '../common/logger/logger';

function renderOrderConfirmationHtml(
  order: OrderResponse,
  audience: 'customer' | 'admin' = 'customer',
): string {
  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${item.name} × ${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">₹${item.subtotal}</td>
        </tr>`,
    )
    .join('');

  const chargeRows = order.charges
    .map(
      (charge) => `
        <tr>
          <td style="padding:4px 0;">${charge.name}</td>
          <td style="padding:4px 0;text-align:right;">₹${charge.amount}</td>
        </tr>`,
    )
    .join('');

  const heading =
    audience === 'admin'
      ? `<h1 style="font-size:22px;">New order received — ${order.orderNumber}</h1>
         <p>Placed by ${order.customerName} (${order.customerEmail || order.customerPhone}).</p>`
      : `<h1 style="font-size:22px;">Thank you for your order, ${order.customerName}! 🎉</h1>
         <p>Congratulations on your new piece from Lorka Jewellers — we're preparing it with care.</p>`;

  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      ${heading}

      <h2 style="font-size:16px;margin-top:24px;">Invoice — ${order.orderNumber}</h2>
      <p style="color:#666;font-size:13px;">Placed on ${new Date(order.createdAt).toLocaleString()}</p>

      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <tbody>${itemRows}</tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px;">
        <tr>
          <td style="padding:4px 0;">Subtotal</td>
          <td style="padding:4px 0;text-align:right;">₹${order.subtotal}</td>
        </tr>
        ${chargeRows}
        <tr>
          <td style="padding:8px 0;font-weight:bold;border-top:1px solid #eee;">Total</td>
          <td style="padding:8px 0;font-weight:bold;text-align:right;border-top:1px solid #eee;">₹${order.total}</td>
        </tr>
      </table>

      <h2 style="font-size:16px;margin-top:24px;">Shipping to</h2>
      <p style="font-size:14px;color:#444;">
        ${order.shippingAddress.line1}${order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />
        ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}<br />
        ${order.shippingAddress.country}
      </p>

      <p style="margin-top:24px;color:#666;font-size:13px;">
        Payment method: ${order.paymentMethod.toUpperCase()} (${order.paymentStatus})
        ${order.hasBuildItems ? '<br />This order includes made-to-order item(s) — we\'ll confirm the build timeline separately.' : ''}
      </p>

      <p style="margin-top:24px;">With love,<br />Lorka Jewellers</p>
    </div>
  `;
}

function renderBuildEtaHtml(order: OrderResponse): string {
  const eta = order.estimatedReadyDate ? new Date(order.estimatedReadyDate) : null;
  const daysFromNow = eta ? Math.max(0, Math.ceil((eta.getTime() - Date.now()) / 86_400_000)) : null;

  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h1 style="font-size:22px;">Your build timeline is set!</h1>
      <p>Hi ${order.customerName}, we've confirmed the build timeline for your made-to-order piece.</p>

      <h2 style="font-size:16px;margin-top:24px;">Order ${order.orderNumber}</h2>
      ${
        eta
          ? `<p>Expected ready by <strong>${eta.toLocaleDateString()}</strong>${
              daysFromNow !== null ? ` (about ${daysFromNow} day${daysFromNow === 1 ? '' : 's'} from now)` : ''
            }.</p>`
          : `<p>We'll follow up shortly with a confirmed date.</p>`
      }

      <p style="margin-top:24px;color:#666;font-size:13px;">
        We'll notify you again as soon as your order ships.
      </p>

      <p style="margin-top:24px;">With love,<br />Lorka Jewellers</p>
    </div>
  `;
}

const ORDER_STATUS_COPY: Record<OrderStatus, { subject: string; heading: string; message: string }> = {
  [OrderStatus.Pending]: {
    subject: 'Order received',
    heading: 'Your order is pending confirmation',
    message: "We've received your order and will confirm it shortly.",
  },
  [OrderStatus.Confirmed]: {
    subject: 'Order confirmed',
    heading: 'Your order is confirmed! ✅',
    message: "We've confirmed your order and are getting it ready.",
  },
  [OrderStatus.Shipped]: {
    subject: 'Order shipped',
    heading: 'Your order is on its way! 🚚',
    message: 'Your order has been shipped and is headed your way.',
  },
  [OrderStatus.Delivered]: {
    subject: 'Order delivered',
    heading: 'Your order has been delivered 🎉',
    message: 'Your order has been delivered. We hope you love it!',
  },
  [OrderStatus.Cancelled]: {
    subject: 'Order cancelled',
    heading: 'Your order has been cancelled',
    message: 'Your order has been cancelled. If this is unexpected, please get in touch with us.',
  },
};

function renderOrderStatusHtml(order: OrderResponse): string {
  const copy = ORDER_STATUS_COPY[order.status];
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h1 style="font-size:22px;">${copy.heading}</h1>
      <p>Hi ${order.customerName}, ${copy.message}</p>

      <h2 style="font-size:16px;margin-top:24px;">Order ${order.orderNumber}</h2>
      <p style="color:#666;font-size:13px;">Total: ₹${order.total}</p>

      <p style="margin-top:24px;">With love,<br />Lorka Jewellers</p>
    </div>
  `;
}

/** Real Gmail SMTP transport, used when SMTP_USER/SMTP_PASS are configured. */
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
    await this.send(to, 'Reset your Lorka Jewellers password', `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires shortly.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `);
  }

  async sendOrderConfirmation(to: string, order: OrderResponse): Promise<void> {
    await this.send(
      to,
      `Order confirmed — ${order.orderNumber} | Lorka Jewellers`,
      renderOrderConfirmationHtml(order, 'customer'),
    );
  }

  async sendEmailVerificationOtp(to: string, otp: string): Promise<void> {
    await this.send(to, 'Verify your email — Lorka Jewellers', `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <h1 style="font-size:22px;">Confirm your email</h1>
        <p>Use this code to verify your Lorka Jewellers account:</p>
        <p style="margin:24px 0;font-size:32px;font-weight:bold;letter-spacing:8px;">${otp}</p>
        <p style="color:#666;font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `);
  }

  async sendBuildEtaUpdate(to: string, order: OrderResponse): Promise<void> {
    await this.send(to, `Build timeline set — ${order.orderNumber} | Lorka Jewellers`, renderBuildEtaHtml(order));
  }

  async sendAdminOrderNotification(to: string, order: OrderResponse): Promise<void> {
    await this.send(
      to,
      `New order received — ${order.orderNumber} | Lorka Jewellers`,
      renderOrderConfirmationHtml(order, 'admin'),
    );
  }

  async sendOrderStatusUpdate(to: string, order: OrderResponse): Promise<void> {
    const copy = ORDER_STATUS_COPY[order.status];
    await this.send(
      to,
      `${copy.subject} — ${order.orderNumber} | Lorka Jewellers`,
      renderOrderStatusHtml(order),
    );
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      logger.error({ err, to, subject }, '[email] Failed to send email via SMTP');
    }
  }
}

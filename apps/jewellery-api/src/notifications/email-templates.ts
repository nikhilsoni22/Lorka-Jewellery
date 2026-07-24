import { OrderStatus, type OrderResponse } from '@lorka/types';

export interface EmailContent {
  subject: string;
  html: string;
}

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

export function passwordResetEmail(resetUrl: string): EmailContent {
  return {
    subject: 'Reset your Lorka Jewellers password',
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires shortly.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  };
}

export function emailVerificationOtpEmail(otp: string): EmailContent {
  return {
    subject: 'Verify your email — Lorka Jewellers',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <h1 style="font-size:22px;">Confirm your email</h1>
        <p>Use this code to verify your Lorka Jewellers account:</p>
        <p style="margin:24px 0;font-size:32px;font-weight:bold;letter-spacing:8px;">${otp}</p>
        <p style="color:#666;font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  };
}

export function orderConfirmationEmail(order: OrderResponse): EmailContent {
  return {
    subject: `Order confirmed — ${order.orderNumber} | Lorka Jewellers`,
    html: renderOrderConfirmationHtml(order, 'customer'),
  };
}

export function buildEtaUpdateEmail(order: OrderResponse): EmailContent {
  return {
    subject: `Build timeline set — ${order.orderNumber} | Lorka Jewellers`,
    html: renderBuildEtaHtml(order),
  };
}

export function adminOrderNotificationEmail(order: OrderResponse): EmailContent {
  return {
    subject: `New order received — ${order.orderNumber} | Lorka Jewellers`,
    html: renderOrderConfirmationHtml(order, 'admin'),
  };
}

export function orderStatusUpdateEmail(order: OrderResponse): EmailContent {
  const copy = ORDER_STATUS_COPY[order.status];
  return {
    subject: `${copy.subject} — ${order.orderNumber} | Lorka Jewellers`,
    html: renderOrderStatusHtml(order),
  };
}

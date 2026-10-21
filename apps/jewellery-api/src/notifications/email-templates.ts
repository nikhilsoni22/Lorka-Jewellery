import { OrderStatus, PaymentMethod, PaymentStatus, type OrderResponse } from '@lorka/types';
import type { AdminPaymentAlert, AdminTicketNotification } from '../common/interfaces/services';
import { env } from '../config/env';

export interface EmailContent {
  subject: string;
  html: string;
}

/** Google Maps directions link for the delivery address — opens turn-by-turn navigation in the
 * Maps app/site. Uses the exact pin the customer picked at checkout when we have one, otherwise
 * falls back to searching the typed address. Needs no API key. */
function mapsNavigationUrl(order: OrderResponse): string {
  const { location, line1, line2, city, state, postalCode, country } = order.shippingAddress;
  const destination = location
    ? `${location.lat},${location.lng}`
    : [line1, line2, city, state, postalCode, country].filter(Boolean).join(', ');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}

/** The customer's order page — where a UPI order's payment details are (re)entered, too. */
function trackOrderUrl(order: OrderResponse): string {
  return `${env.WEBSITE_URL}/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(order.customerPhone)}`;
}

function trackOrderButton(order: OrderResponse, label: string): string {
  return `<p style="margin:24px 0 0;">
        <a href="${trackOrderUrl(order)}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;font-weight:bold;">${label}</a>
      </p>`;
}

/** The server runs in UTC, so bare toLocaleString() printed UTC time in US format (month/day).
 * Pin everything to India time and day/month/year. */
const EMAIL_TIME_ZONE = 'Asia/Kolkata';

function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString('en-IN', {
    timeZone: EMAIL_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-IN', {
    timeZone: EMAIL_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isAwaitingUpiPayment(order: OrderResponse): boolean {
  return order.paymentMethod === PaymentMethod.Upi && order.paymentStatus !== PaymentStatus.Paid && order.paymentStatus !== PaymentStatus.Refunded;
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
         <p style="margin:4px 0;">Placed by <strong>${order.customerName}</strong></p>
         <p style="margin:4px 0;">Phone: <a href="tel:${order.customerPhone}">${order.customerPhone}</a></p>
         ${order.customerEmail ? `<p style="margin:4px 0;">Email: <a href="mailto:${order.customerEmail}">${order.customerEmail}</a></p>` : ''}`
      : `<h1 style="font-size:22px;">Thank you for your order, ${order.customerName}! 🎉</h1>
         <p>Congratulations on your new piece from Lorka Jewellers — we're preparing it with care.</p>`;

  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      ${heading}

      <h2 style="font-size:16px;margin-top:24px;">${isAwaitingUpiPayment(order) ? 'Order summary' : 'Invoice'} — ${order.orderNumber}</h2>
      <p style="color:#666;font-size:13px;">Placed on ${formatDateTime(order.createdAt)}</p>

      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <tbody>${itemRows}</tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px;">
        <tr>
          <td style="padding:4px 0;">Subtotal</td>
          <td style="padding:4px 0;text-align:right;">₹${order.subtotal}</td>
        </tr>
        ${
          order.discount > 0
            ? `<tr>
          <td style="padding:4px 0;color:#2e7d32;">Coupon ${order.couponCode ? escapeHtml(order.couponCode) : ''}</td>
          <td style="padding:4px 0;text-align:right;color:#2e7d32;">−₹${order.discount}</td>
        </tr>`
            : ''
        }
        ${chargeRows}
        ${
          order.prepaidDiscount > 0
            ? `<tr>
          <td style="padding:4px 0;color:#2e7d32;">Prepaid discount</td>
          <td style="padding:4px 0;text-align:right;color:#2e7d32;">−₹${order.prepaidDiscount}</td>
        </tr>`
            : ''
        }
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
      ${
        audience === 'admin'
          ? `<p style="margin:12px 0 0;">
        <a href="${mapsNavigationUrl(order)}" style="display:inline-block;background:#1a73e8;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;font-weight:bold;">📍 Navigate to delivery address</a>
      </p>`
          : ''
      }

      ${
        order.giftWrap
          ? `<p style="margin-top:16px;padding:10px 14px;background:#f7f4ef;border-left:3px solid #c9a24a;font-size:14px;">
        🎁 <strong>Gift wrapped</strong>${order.giftMessage ? `<br />Message: “${escapeHtml(order.giftMessage)}”` : ''}
      </p>`
          : ''
      }

      <p style="margin-top:24px;color:#666;font-size:13px;">
        Payment method: ${order.paymentMethod.toUpperCase()} (${order.paymentStatus})
        ${
          audience === 'customer' && isAwaitingUpiPayment(order)
            ? `<br />Haven't paid yet? <a href="${trackOrderUrl(order)}">Open your order</a> to pay by UPI and enter the transaction ID${
                order.upiPaymentDueAt ? ` by ${formatDateTime(order.upiPaymentDueAt)} (unpaid orders are cancelled automatically)` : ''
              } — we'll email you as soon as the payment is verified.`
            : ''
        }
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
          ? `<p>Expected ready by <strong>${formatDate(eta)}</strong>${
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

/** Ticket subject/message are free text typed by the customer — never inject them as raw HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderAdminTicketHtml(data: AdminTicketNotification): string {
  const { ticket, customerPhone, shippingAddress, latestOrderNumber } = data;
  const name = escapeHtml(ticket.customerName);
  const email = escapeHtml(ticket.customerEmail);
  const phone = customerPhone ? escapeHtml(customerPhone) : '';
  const notOnFile = '<span style="color:#999;">Not on file (no orders yet)</span>';
  const address = shippingAddress
    ? `${escapeHtml(shippingAddress.line1)}${shippingAddress.line2 ? `, ${escapeHtml(shippingAddress.line2)}` : ''}<br />
       ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.state)} ${escapeHtml(shippingAddress.postalCode)}<br />
       ${escapeHtml(shippingAddress.country)}`
    : notOnFile;
  const replySubject = encodeURIComponent(`Re: ${ticket.subject}`);
  const row = (label: string, value: string) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#666;font-size:13px;vertical-align:top;white-space:nowrap;">${label}</td>
          <td style="padding:6px 0;font-size:14px;">${value}</td>
        </tr>`;

  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h1 style="font-size:22px;">New support ticket 🎫</h1>
      <p style="color:#666;font-size:13px;">Raised on ${formatDateTime(ticket.createdAt)}</p>

      <h2 style="font-size:16px;margin-top:24px;">${escapeHtml(ticket.subject)}</h2>
      <div style="background:#f7f4ef;border-left:3px solid #c9a24a;padding:12px 16px;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(ticket.message)}</div>

      <h2 style="font-size:16px;margin-top:24px;">Customer details</h2>
      <table style="border-collapse:collapse;">
        ${row('Name', `<strong>${name}</strong>`)}
        ${row('Email', `<a href="mailto:${email}?subject=${replySubject}">${email}</a>`)}
        ${row('Phone', phone ? `<a href="tel:${phone}">${phone}</a>` : notOnFile)}
        ${row('Address', address)}
        ${latestOrderNumber ? row('Latest order', escapeHtml(latestOrderNumber)) : ''}
      </table>
      ${
        phone || shippingAddress
          ? '<p style="color:#999;font-size:12px;margin-top:8px;">Phone and address are from the customer\'s most recent order.</p>'
          : ''
      }

      <p style="margin:24px 0 0;">
        <a href="mailto:${email}?subject=${replySubject}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;font-weight:bold;">Reply to ${name}</a>
      </p>
    </div>
  `;
}

export function adminPaymentAlertEmail(data: AdminPaymentAlert): EmailContent {
  return {
    subject: `⚠️ Payment received but order NOT created — ₹${data.amount} | Lorka Jewellers`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <h1 style="font-size:22px;color:#b71c1c;">Payment received, but no order was created</h1>
        <p>A customer paid online, but the order could not be created automatically. Please contact
        them and either create the order manually or refund the payment from the Razorpay dashboard.</p>
        <table style="border-collapse:collapse;margin-top:16px;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Customer</td><td>${escapeHtml(data.customerName)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Phone</td><td><a href="tel:${escapeHtml(data.customerPhone)}">${escapeHtml(data.customerPhone)}</a></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Amount</td><td><strong>₹${data.amount}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Payment ID</td><td>${escapeHtml(data.razorpayPaymentId)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Razorpay order</td><td>${escapeHtml(data.razorpayOrderId)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top;">Reason</td><td>${escapeHtml(data.reason)}</td></tr>
        </table>
      </div>
    `,
  };
}

export function adminTicketNotificationEmail(data: AdminTicketNotification): EmailContent {
  return {
    subject: `New support ticket — ${data.ticket.subject} | Lorka Jewellers`,
    html: renderAdminTicketHtml(data),
  };
}

export function paymentVerifiedEmail(order: OrderResponse): EmailContent {
  return {
    subject: `Payment received — ${order.orderNumber} | Lorka Jewellers`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <h1 style="font-size:22px;">Your payment is verified ✅</h1>
        <p>Hi ${escapeHtml(order.customerName)}, we've received your UPI payment of <strong>₹${order.total}</strong>
        for order <strong>${order.orderNumber}</strong>. Thank you!</p>
        ${order.upiReference ? `<p style="color:#666;font-size:13px;">UPI transaction ID: ${escapeHtml(order.upiReference)}</p>` : ''}
        <p>We're getting your order ready and will let you know as soon as it ships.</p>
        ${trackOrderButton(order, 'Track your order')}
        <p style="margin-top:24px;">With love,<br />Lorka Jewellers</p>
      </div>
    `,
  };
}

export function paymentRejectedEmail(order: OrderResponse, reason: string): EmailContent {
  return {
    subject: `We couldn't verify your payment — ${order.orderNumber} | Lorka Jewellers`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <h1 style="font-size:22px;">We couldn't verify your payment</h1>
        <p>Hi ${escapeHtml(order.customerName)}, we couldn't find a UPI payment of <strong>₹${order.total}</strong>
        for order <strong>${order.orderNumber}</strong>${order.upiReference ? ` with transaction ID ${escapeHtml(order.upiReference)}` : ''}.</p>
        ${reason ? `<div style="background:#f7f4ef;border-left:3px solid #c9a24a;padding:12px 16px;font-size:14px;">${escapeHtml(reason)}</div>` : ''}
        <p>If you have paid, please open your order and enter the correct UPI transaction ID (UTR) from your
        UPI app, or reply to this email and we'll sort it out.</p>
        ${trackOrderButton(order, 'Open your order')}
        <p style="margin-top:24px;">With love,<br />Lorka Jewellers</p>
      </div>
    `,
  };
}

export function unpaidOrderCancelledEmail(order: OrderResponse): EmailContent {
  return {
    subject: `Order cancelled — payment not received — ${order.orderNumber} | Lorka Jewellers`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <h1 style="font-size:22px;">Your order has been cancelled</h1>
        <p>Hi ${escapeHtml(order.customerName)}, we didn't receive the UPI payment of <strong>₹${order.total}</strong>
        for order <strong>${order.orderNumber}</strong> in time, so it has been cancelled automatically.</p>
        <p>If you have already paid, please reply to this email with the UPI transaction ID (UTR) and we'll
        sort it out right away. Otherwise you're welcome to place the order again any time.</p>
        <p style="margin-top:24px;">With love,<br />Lorka Jewellers</p>
      </div>
    `,
  };
}

export function adminUpiPaymentSubmittedEmail(order: OrderResponse): EmailContent {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#666;">${label}</td><td>${value}</td></tr>`;
  return {
    subject: `UPI payment to verify — ₹${order.total} — ${order.orderNumber} | Lorka Jewellers`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <h1 style="font-size:22px;">A customer says they've paid by UPI</h1>
        <p>Check your bank / UPI app for this credit. Only once you can see it, open the order in the admin
        panel and click <strong>Verify payment</strong> — the customer is emailed automatically.</p>
        <table style="border-collapse:collapse;margin-top:16px;font-size:14px;">
          ${row('Order', `<strong>${order.orderNumber}</strong>`)}
          ${row('Amount', `<strong>₹${order.total}</strong>`)}
          ${row('UPI transaction ID (UTR)', `<strong>${escapeHtml(order.upiReference ?? '')}</strong>`)}
          ${row('Customer', escapeHtml(order.customerName))}
          ${row('Phone', `<a href="tel:${escapeHtml(order.customerPhone)}">${escapeHtml(order.customerPhone)}</a>`)}
        </table>
        <p style="color:#999;font-size:12px;margin-top:16px;">Never ship on a screenshot or UTR alone — confirm the money is in your account.</p>
      </div>
    `,
  };
}

export function orderStatusUpdateEmail(order: OrderResponse): EmailContent {
  const copy = ORDER_STATUS_COPY[order.status];
  return {
    subject: `${copy.subject} — ${order.orderNumber} | Lorka Jewellers`,
    html: renderOrderStatusHtml(order),
  };
}

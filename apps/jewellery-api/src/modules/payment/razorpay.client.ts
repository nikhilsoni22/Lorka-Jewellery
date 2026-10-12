import crypto from 'node:crypto';
import { logger } from '../../common/logger/logger';
import { AppError } from '../../common/errors/app-error';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

function authHeader(keyId: string, keySecret: string): string {
  const token = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  return `Basic ${token}`;
}

/** Creates a Razorpay order for the given amount (in paise). Auto-captures on payment success.
 * Credentials come from the caller (sourced from admin-configured Settings), not from env. */
export async function createRazorpayOrder(
  amountPaise: number,
  receipt: string,
  keyId: string,
  keySecret: string,
): Promise<RazorpayOrder> {
  let res: Response;
  try {
    res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader(keyId, keySecret),
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        payment_capture: 1,
      }),
    });
  } catch (err) {
    logger.error({ err }, 'Razorpay order creation request failed');
    throw AppError.internal('Unable to reach the payment gateway. Please try again.');
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error({ status: res.status, body }, 'Razorpay order creation returned an error');
    throw AppError.internal('Unable to initiate payment. Please try again.');
  }

  return (await res.json()) as RazorpayOrder;
}

export interface RazorpayRefund {
  id: string;
  amount: number;
  status: string;
}

/** Refunds `amountPaise` of a captured payment back to the customer's original payment method. */
export async function refundRazorpayPayment(
  paymentId: string,
  amountPaise: number,
  keyId: string,
  keySecret: string,
): Promise<RazorpayRefund> {
  let res: Response;
  try {
    res = await fetch(`${RAZORPAY_API_BASE}/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader(keyId, keySecret) },
      body: JSON.stringify({ amount: amountPaise, speed: 'normal' }),
    });
  } catch (err) {
    logger.error({ err, paymentId }, 'Razorpay refund request failed');
    throw AppError.internal('Unable to reach the payment gateway. Please try again.');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { description?: string } } | null;
    logger.error({ status: res.status, body, paymentId }, 'Razorpay refund returned an error');
    throw AppError.badRequest(`Razorpay refused the refund: ${body?.error?.description ?? 'unknown error'}`);
  }

  return (await res.json()) as RazorpayRefund;
}

/** Verifies a webhook's X-Razorpay-Signature: HMAC-SHA256 of the exact raw request body, keyed
 * with the webhook secret set in the Razorpay dashboard (not the API key secret). */
export function verifyRazorpayWebhookSignature(rawBody: Buffer, signature: string, webhookSecret: string): boolean {
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/** Verifies the HMAC-SHA256 signature Razorpay returns after a successful checkout. */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

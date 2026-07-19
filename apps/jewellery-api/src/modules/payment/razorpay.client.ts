import crypto from 'node:crypto';
import { env } from '../../config/env';
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

function authHeader(): string {
  const token = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

/** Creates a Razorpay order for the given amount (in paise). Auto-captures on payment success. */
export async function createRazorpayOrder(amountPaise: number, receipt: string): Promise<RazorpayOrder> {
  let res: Response;
  try {
    res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader(),
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

/** Verifies the HMAC-SHA256 signature Razorpay returns after a successful checkout. */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

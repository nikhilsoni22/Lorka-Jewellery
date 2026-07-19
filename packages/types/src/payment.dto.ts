import type { z } from 'zod';
import type { createRazorpayOrderSchema } from './payment.schemas';

export type CreateRazorpayOrderInput = z.infer<typeof createRazorpayOrderSchema>;

export interface RazorpayOrderResponse {
  razorpayOrderId: string;
  /** Amount in paise, as returned by Razorpay. */
  amount: number;
  currency: string;
  keyId: string;
}

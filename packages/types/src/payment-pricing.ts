import { PaymentMethod } from './order.enums';
import { ChargeType } from './settings.enums';

/** A COD fee or prepaid discount set by the admin. `value` 0 turns it off. */
export interface PaymentPriceRule {
  type: ChargeType;
  value: number;
  /** Percentage rules only: the most it can come to, in ₹. 0 = no limit. */
  maxAmount: number;
}

export interface PaymentPricing {
  /** Added to Cash on Delivery orders. */
  codFee: PaymentPriceRule;
  /** Taken off orders paid up front (online / UPI). */
  prepaidDiscount: PaymentPriceRule;
}

/** Name of the order charge line a COD fee is stored and shown as. */
export const COD_FEE_LABEL = 'COD charges';

const PREPAID_METHODS: PaymentMethod[] = [PaymentMethod.Razorpay, PaymentMethod.Upi];

const round2 = (n: number) => Math.round(n * 100) / 100;

function ruleAmount(base: number, rule: PaymentPriceRule | undefined): number {
  if (!rule || !(rule.value > 0) || !(base > 0)) return 0;
  if (rule.type !== ChargeType.Percentage) return round2(rule.value);
  const amount = (base * rule.value) / 100;
  return round2(rule.maxAmount > 0 ? Math.min(amount, rule.maxAmount) : amount);
}

/**
 * The COD fee or prepaid discount for paying with `method`, worked out on `base` — the price of the
 * goods after any coupon. Shared by the API (what the customer is charged) and the website (what
 * checkout shows), so the two can never disagree.
 */
export function paymentAdjustment(
  method: PaymentMethod | `${PaymentMethod}`,
  base: number,
  pricing: PaymentPricing | undefined,
): { codFee: number; prepaidDiscount: number } {
  if (method === PaymentMethod.Cod) return { codFee: ruleAmount(base, pricing?.codFee), prepaidDiscount: 0 };
  if (PREPAID_METHODS.includes(method as PaymentMethod)) {
    // A discount can't take the goods below ₹0.
    return { codFee: 0, prepaidDiscount: Math.min(ruleAmount(base, pricing?.prepaidDiscount), round2(base)) };
  }
  return { codFee: 0, prepaidDiscount: 0 };
}

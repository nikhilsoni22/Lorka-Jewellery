import { describe, it, expect } from 'vitest';
import { ChargeType, PaymentMethod, paymentAdjustment, type PaymentPricing } from '@lorka/types';

const pricing = (codFee: Partial<PaymentPricing['codFee']>, prepaidDiscount: Partial<PaymentPricing['prepaidDiscount']>): PaymentPricing => ({
  codFee: { type: ChargeType.Fixed, value: 0, maxAmount: 0, ...codFee },
  prepaidDiscount: { type: ChargeType.Fixed, value: 0, maxAmount: 0, ...prepaidDiscount },
});

describe('paymentAdjustment', () => {
  const rules = pricing({ value: 49 }, { type: ChargeType.Percentage, value: 5, maxAmount: 300 });

  it('adds the COD fee only to cash on delivery', () => {
    expect(paymentAdjustment(PaymentMethod.Cod, 1200, rules)).toEqual({ codFee: 49, prepaidDiscount: 0 });
  });

  it('gives the prepaid discount to online and UPI payments, capped at the maximum', () => {
    expect(paymentAdjustment(PaymentMethod.Razorpay, 1200, rules)).toEqual({ codFee: 0, prepaidDiscount: 60 });
    expect(paymentAdjustment(PaymentMethod.Upi, 1200, rules)).toEqual({ codFee: 0, prepaidDiscount: 60 });
    // 5% of ₹50,000 is ₹2,500, but the admin capped it at ₹300.
    expect(paymentAdjustment(PaymentMethod.Upi, 50_000, rules).prepaidDiscount).toBe(300);
  });

  it('never discounts below zero, and does nothing when no rules are set', () => {
    expect(paymentAdjustment(PaymentMethod.Upi, 80, pricing({}, { value: 100 })).prepaidDiscount).toBe(80);
    expect(paymentAdjustment(PaymentMethod.Cod, 1200, pricing({}, {}))).toEqual({ codFee: 0, prepaidDiscount: 0 });
    expect(paymentAdjustment(PaymentMethod.Cod, 1200, undefined)).toEqual({ codFee: 0, prepaidDiscount: 0 });
  });
});

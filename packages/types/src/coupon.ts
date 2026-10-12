import { z } from 'zod';

export enum CouponType {
  /** `value` percent off the subtotal, optionally capped by `maxDiscount`. */
  Percentage = 'percentage',
  /** `value` rupees off the subtotal. */
  Flat = 'flat',
}

const couponCode = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, 'Code must be at least 3 characters')
  .max(40)
  .regex(/^[A-Z0-9_-]+$/, 'Use only letters, numbers, - and _');

const nullableNumber = z
  .union([z.literal(''), z.null(), z.coerce.number().nonnegative()])
  .transform((v) => (v === '' || v === null ? null : v))
  .optional();

const couponFields = {
  code: couponCode,
  description: z.string().trim().max(200).optional().default(''),
  type: z.nativeEnum(CouponType),
  value: z.coerce.number().positive('Value must be greater than 0'),
  /** Subtotal (₹) the cart must reach before the coupon applies. */
  minOrderAmount: z.coerce.number().nonnegative().optional().default(0),
  /** Cap on the rupee discount for percentage coupons; null = no cap. */
  maxDiscount: nullableNumber,
  /** Total redemptions allowed across all customers; null = unlimited. */
  usageLimit: nullableNumber,
  expiresAt: z
    .union([z.literal(''), z.null(), z.coerce.date()])
    .transform((v) => (v === '' || v === null ? null : v))
    .optional(),
  isActive: z.boolean().optional().default(true),
};

const percentageCap = (data: { type?: CouponType; value?: number }, ctx: z.RefinementCtx) => {
  if (data.type === CouponType.Percentage && data.value !== undefined && data.value > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Percentage cannot exceed 100' });
  }
};

export const createCouponSchema = z.object(couponFields).superRefine(percentageCap);
export const updateCouponSchema = z.object(couponFields).partial().superRefine(percentageCap);

export const validateCouponSchema = z.object({
  code: couponCode,
  subtotal: z.coerce.number().nonnegative(),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

export interface CouponResponse {
  id: string;
  code: string;
  description: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponValidationResponse {
  code: string;
  /** Rupees off the given subtotal. */
  discount: number;
  description: string;
}

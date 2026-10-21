import { z } from 'zod';
import { ChargeType } from './settings.enums';

export const chargeInputSchema = z
  .object({
    id: z.string().trim().optional(),
    name: z.string().trim().min(1, 'Name is required').max(60),
    type: z.nativeEnum(ChargeType),
    value: z.coerce.number().min(0),
    isActive: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.type === ChargeType.Percentage && data.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'Percentage charges cannot exceed 100',
      });
    }
  });

export const maintenanceInputSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    message: z.string().trim().max(500).optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.startAt && data.endAt && data.endAt < data.startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endAt'],
        message: 'End time must be after the start time',
      });
    }
  });

export const paymentMethodsInputSchema = z
  .object({
    onlineEnabled: z.boolean().optional().default(true),
    codEnabled: z.boolean().optional().default(true),
    upiEnabled: z.boolean().optional().default(false),
    upiId: z
      .string()
      .trim()
      .regex(/^[\w.-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/, 'Enter a valid UPI ID — e.g. lorka@okaxis')
      .or(z.literal(''))
      .optional()
      .default(''),
    upiPayeeName: z.string().trim().max(60).optional().default(''),
    /** Unpaid UPI orders (no transaction ID entered) are cancelled this many hours after placing. */
    upiPaymentWindowHours: z.coerce.number().int().min(1).max(168).optional().default(24),
  })
  .superRefine((data, ctx) => {
    if (data.upiEnabled && !data.upiId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['upiId'],
        message: 'Add your UPI ID to turn on UPI payments',
      });
    }
  });

const paymentPriceRuleSchema = z
  .object({
    type: z.nativeEnum(ChargeType).optional().default(ChargeType.Fixed),
    value: z.coerce.number().min(0).optional().default(0),
    maxAmount: z.coerce.number().min(0).optional().default(0),
  })
  .superRefine((data, ctx) => {
    if (data.type === ChargeType.Percentage && data.value > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'A percentage cannot exceed 100' });
    }
  });

/** COD fee / prepaid discount — see `paymentAdjustment`. */
export const paymentPricingInputSchema = z.object({
  codFee: paymentPriceRuleSchema.optional().default({}),
  prepaidDiscount: paymentPriceRuleSchema.optional().default({}),
});

const optionalUrl = z.string().trim().url('Must be a full link starting with https://').max(300).or(z.literal(''));

export const storeInfoInputSchema = z.object({
  phone: z.string().trim().max(30).optional().default(''),
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, 'Digits only, with country code — e.g. 919876543210')
    .or(z.literal(''))
    .optional()
    .default(''),
  email: z.string().trim().email('A valid email is required').or(z.literal('')).optional().default(''),
  address: z.string().trim().max(400).optional().default(''),
  instagramUrl: optionalUrl.optional().default(''),
  facebookUrl: optionalUrl.optional().default(''),
  youtubeUrl: optionalUrl.optional().default(''),
  gstin: z.string().trim().toUpperCase().max(20).optional().default(''),
});

export const policiesInputSchema = z.object({
  privacy: z.string().trim().max(20000).optional().default(''),
  terms: z.string().trim().max(20000).optional().default(''),
  refund: z.string().trim().max(20000).optional().default(''),
  shipping: z.string().trim().max(20000).optional().default(''),
});

export const updateSettingsSchema = z.object({
  silverRatePerKg: z.coerce.number().nonnegative('Silver rate must be 0 or greater'),
  goldRatePer10g: z.coerce.number().nonnegative('Gold rate must be 0 or greater'),
  charges: z.array(chargeInputSchema).max(20),
  maintenance: maintenanceInputSchema,
  paymentMethods: paymentMethodsInputSchema.optional().default({}),
  notificationEmail: z
    .string()
    .trim()
    .email('A valid email is required')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),
  razorpayKeyId: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : undefined)),
  razorpayKeySecret: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : undefined)),
  razorpayWebhookSecret: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : undefined)),
  // Optional so an older admin panel that doesn't send them leaves the saved values untouched.
  storeInfo: storeInfoInputSchema.optional(),
  paymentPricing: paymentPricingInputSchema.optional(),
  policies: policiesInputSchema.optional(),
});

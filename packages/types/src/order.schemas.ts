import { z } from 'zod';
import { paginationQuerySchema } from './common.schemas';
import { OrderStatus, PaymentMethod } from './order.enums';

const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const orderItemInputSchema = z.object({
  productId: objectId,
  quantity: z.coerce.number().int().positive().max(50),
  isBuildOrder: z.boolean().optional().default(false),
});

// Delivery is only live in these two cities for now; update here (and in the website's
// checkout copy) when coverage expands to more cities.
export const ALLOWED_ORDER_CITIES = ['Jodhpur', 'Jaipur'] as const;

const isAllowedOrderCity = (city: string) =>
  ALLOWED_ORDER_CITIES.some((c) => c.toLowerCase() === city.trim().toLowerCase());

export const geoLocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const shippingAddressSchema = z
  .object({
    line1: z.string().trim().min(3).max(200),
    line2: z.string().trim().max(200).optional().default(''),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    postalCode: z.string().trim().min(3).max(12),
    country: z.string().trim().min(2).max(100).optional().default('India'),
    location: geoLocationSchema.nullable().optional(),
  })
  .refine((data) => isAllowedOrderCity(data.city), {
    message: `We currently deliver only within ${ALLOWED_ORDER_CITIES.join(' and ')}`,
    path: ['city'],
  });

/** Everything the customer fills in at checkout — shared by order placement and by the Razorpay
 * order request (which stores it, so a payment webhook can still create the order if the
 * customer's browser never comes back after paying). */
export const checkoutDetailsSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, 'Invalid phone number'),
  customerEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),
  shippingAddress: shippingAddressSchema,
  items: z.array(orderItemInputSchema).min(1, 'At least one item is required').max(50),
  notes: z.string().trim().max(1000).optional().default(''),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .max(40)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),
  giftWrap: z.boolean().optional().default(false),
  giftMessage: z.string().trim().max(250).optional().default(''),
});

export const createOrderSchema = checkoutDetailsSchema
  .extend({
    paymentMethod: z.nativeEnum(PaymentMethod).optional().default(PaymentMethod.Cod),
    razorpayOrderId: z.string().trim().optional(),
    razorpayPaymentId: z.string().trim().optional(),
    razorpaySignature: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod !== PaymentMethod.Razorpay) return;
    for (const field of ['razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature'] as const) {
      if (!data[field]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} is required for online payments`,
        });
      }
    }
  });

/** The reference a UPI app shows for a payment — "UTR" / "UPI Ref No." (12 digits on most apps). */
export const upiReferenceSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6,35}$/, 'Enter the UPI transaction ID / UTR exactly as shown in your UPI app');

/**
 * Customer → us, after paying a UPI order ("I have paid"). Located by orderNumber + phone, like
 * order tracking. The UTR is optional: the admin can usually match the payment by its amount and
 * the "Order <number>" note the QR fills in — it's only required after a payment was rejected.
 */
export const submitUpiPaymentSchema = z.object({
  orderNumber: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  upiReference: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    upiReferenceSchema.optional(),
  ),
});

/** Admin's decision on a manual (UPI) payment after checking the bank account. */
export const reviewPaymentSchema = z.object({
  action: z.enum(['verify', 'reject']),
  /** Shown to the customer in the rejection email. */
  reason: z.string().trim().max(300).optional().default(''),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

/** Omit `amount` for a full refund of whatever hasn't been refunded yet. */
export const refundOrderSchema = z.object({
  amount: z.coerce.number().positive('Refund amount must be greater than 0').optional(),
});

export const setBuildEtaSchema = z.object({
  estimatedReadyDate: z.coerce.date(),
});

export const orderQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(OrderStatus).optional(),
  search: z.string().trim().optional(),
});

export const trackOrderQuerySchema = z.object({
  orderNumber: z.string().trim().min(1),
  phone: z.string().trim().min(1),
});

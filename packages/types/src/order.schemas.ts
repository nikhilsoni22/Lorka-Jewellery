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

export const createOrderSchema = z
  .object({
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

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
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

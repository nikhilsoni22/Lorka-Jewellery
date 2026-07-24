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

export const updateSettingsSchema = z.object({
  silverRatePerKg: z.coerce.number().nonnegative('Silver rate must be 0 or greater'),
  goldRatePer10g: z.coerce.number().nonnegative('Gold rate must be 0 or greater'),
  charges: z.array(chargeInputSchema).max(20),
  maintenance: maintenanceInputSchema,
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
});

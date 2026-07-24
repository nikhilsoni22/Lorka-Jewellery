import { z } from 'zod';
import { paginationQuerySchema, booleanQueryParam } from './common.schemas';
import { MetalType } from './catalog.enums';

const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, 'Invalid id');

/** Optional offer, expressed as a percentage (1-100) of the calculated price.
 * - Omitted key → `undefined`: field wasn't touched, leave any existing offer alone.
 * - Blank field ('') → `null`: the admin explicitly cleared the offer, so it must be written
 *   to the update payload — Mongoose silently drops `undefined`-valued keys on update, which is
 *   why clearing the field previously left the old offer in place instead of removing it.
 * - A number → that percentage. */
const optionalDiscountPercent = z
  .union([
    z.literal(''),
    z.coerce.number().positive('Offer must be greater than 0').max(100, 'Offer cannot exceed 100%'),
  ])
  .transform((v) => (v === '' ? null : v))
  .optional();

export const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(140),
  slug: z.string().trim().toLowerCase().min(2).max(160).optional(),
  description: z.string().trim().max(5000).optional().default(''),
  shortDescription: z.string().trim().max(300).optional().default(''),
  category: objectId,
  sku: z.string().trim().min(1, 'SKU is required').max(60),
  metalType: z.nativeEnum(MetalType),
  makingCharge: z.coerce.number().nonnegative('Making charge must be 0 or greater').default(0),
  discountPercent: optionalDiscountPercent,
  images: z.array(z.string().trim().url('Each image must be a valid URL')).min(1, 'At least one image is required'),
  material: z.string().trim().max(80).optional().default(''),
  purity: z.string().trim().max(40).optional().default(''),
  weight: z.coerce.number().positive('Weight (grams) must be greater than 0'),
  stock: z.coerce.number().int().nonnegative().default(0),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(140).optional(),
  slug: z.string().trim().toLowerCase().min(2).max(160).optional(),
  description: z.string().trim().max(5000).optional(),
  shortDescription: z.string().trim().max(300).optional(),
  category: objectId.optional(),
  sku: z.string().trim().min(1).max(60).optional(),
  metalType: z.nativeEnum(MetalType).optional(),
  makingCharge: z.coerce.number().nonnegative().optional(),
  discountPercent: optionalDiscountPercent,
  images: z.array(z.string().trim().url('Each image must be a valid URL')).min(1).optional(),
  material: z.string().trim().max(80).optional(),
  purity: z.string().trim().max(40).optional(),
  weight: z.coerce.number().positive().optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const productQuerySchema = paginationQuerySchema.extend({
  category: objectId.optional(),
  isActive: booleanQueryParam,
  isFeatured: booleanQueryParam,
  search: z.string().trim().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc']).optional().default('newest'),
});

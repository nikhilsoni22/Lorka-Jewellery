import { z } from 'zod';
import { paginationQuerySchema, booleanQueryParam } from './common.schemas';
import { MetalType } from './catalog.enums';

const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const PRODUCT_SORTS = ['newest', 'popular', 'price_asc', 'price_desc', 'name_asc'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/** Optional offer, expressed as a percentage (1-100) of the calculated price.
 * - Omitted key → `undefined`: field wasn't touched, leave any existing offer alone.
 * - Blank field ('') → `null`: the admin explicitly cleared the offer, so it must be written
 *   to the update payload — Mongoose silently drops `undefined`-valued keys on update, which is
 *   why clearing the field previously left the old offer in place instead of removing it.
 * - null → same as blank (no offer).
 * - A number → that percentage. */
const optionalDiscountPercent = z
  .union([
    z.literal(''),
    // The admin form already converts a blank field to null before sending it; accept that
    // here too, otherwise null is coerced to 0 and rejected as "greater than 0".
    z.null(),
    z.coerce.number().positive('Offer must be greater than 0').max(100, 'Offer cannot exceed 100%'),
  ])
  .transform((v) => (v === '' || v === null ? null : v))
  .optional();

/** A product comes in 1 to this many weights, each priced and stocked on its own. */
export const MAX_PRODUCT_VARIANTS = 3;

export const productVariantSchema = z.object({
  weight: z.coerce.number().positive('Weight (grams) must be greater than 0'),
  stock: z.coerce.number().int('Stock must be a whole number').nonnegative('Stock must be 0 or greater').default(0),
});

/** Stored lightest first, so the first weight is the product's "from" price everywhere. */
const productVariantsSchema = z
  .array(productVariantSchema)
  .min(1, 'Add at least one weight')
  .max(MAX_PRODUCT_VARIANTS, `A product can have at most ${MAX_PRODUCT_VARIANTS} weights`)
  .refine((variants) => new Set(variants.map((v) => v.weight)).size === variants.length, {
    message: 'Each weight must be different',
  })
  .transform((variants) => [...variants].sort((a, b) => a.weight - b.weight));

export const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(140),
  slug: z.string().trim().toLowerCase().min(2).max(160).optional(),
  description: z.string().trim().max(5000).optional().default(''),
  shortDescription: z.string().trim().max(300).optional().default(''),
  category: objectId,
  sku: z.string().trim().min(1, 'SKU is required').max(60),
  metalType: z.nativeEnum(MetalType),
  /** Rupees per gram — the making charge on a product is this × its weight. */
  makingChargePerGram: z.coerce.number().nonnegative('Making charge must be 0 or greater').default(0),
  discountPercent: optionalDiscountPercent,
  images: z.array(z.string().trim().url('Each image must be a valid URL')).min(1, 'At least one image is required'),
  material: z.string().trim().max(80).optional().default(''),
  purity: z.string().trim().max(40).optional().default(''),
  variants: productVariantsSchema,
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
  makingChargePerGram: z.coerce.number().nonnegative().optional(),
  discountPercent: optionalDiscountPercent,
  images: z.array(z.string().trim().url('Each image must be a valid URL')).min(1).optional(),
  material: z.string().trim().max(80).optional(),
  purity: z.string().trim().max(40).optional(),
  variants: productVariantsSchema.optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const productQuerySchema = paginationQuerySchema.extend({
  category: objectId.optional(),
  isActive: booleanQueryParam,
  isFeatured: booleanQueryParam,
  search: z.string().trim().optional(),
  sort: z.enum(PRODUCT_SORTS).optional().default('newest'),
  /** Bounds on the live (pre-offer) price, in rupees. */
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  metalType: z.nativeEnum(MetalType).optional(),
  inStock: booleanQueryParam,
  /** Comma-separated product ids — re-reads saved products (wishlist, recently viewed) at live prices. */
  ids: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((id) => id.trim()).filter(Boolean) : undefined))
    .pipe(z.array(objectId).max(100).optional()),
});

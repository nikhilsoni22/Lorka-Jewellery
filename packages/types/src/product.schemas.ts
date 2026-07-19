import { z } from 'zod';
import { paginationQuerySchema, booleanQueryParam } from './common.schemas';

const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createProductSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(140),
    slug: z.string().trim().toLowerCase().min(2).max(160).optional(),
    description: z.string().trim().max(5000).optional().default(''),
    shortDescription: z.string().trim().max(300).optional().default(''),
    category: objectId,
    sku: z.string().trim().min(1, 'SKU is required').max(60),
    price: z.coerce.number().positive('Price must be greater than 0'),
    discountPrice: z.coerce.number().positive().optional(),
    images: z.array(z.string().trim().url('Each image must be a valid URL')).min(1, 'At least one image is required'),
    material: z.string().trim().max(80).optional().default(''),
    purity: z.string().trim().max(40).optional().default(''),
    weight: z.coerce.number().nonnegative().optional(),
    stock: z.coerce.number().int().nonnegative().default(0),
    isFeatured: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
  })
  .refine((data) => data.discountPrice === undefined || data.discountPrice <= data.price, {
    message: 'Discount price must not exceed the regular price',
    path: ['discountPrice'],
  });

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(140).optional(),
    slug: z.string().trim().toLowerCase().min(2).max(160).optional(),
    description: z.string().trim().max(5000).optional(),
    shortDescription: z.string().trim().max(300).optional(),
    category: objectId.optional(),
    sku: z.string().trim().min(1).max(60).optional(),
    price: z.coerce.number().positive().optional(),
    discountPrice: z.coerce.number().positive().optional(),
    images: z.array(z.string().trim().url('Each image must be a valid URL')).min(1).optional(),
    material: z.string().trim().max(80).optional(),
    purity: z.string().trim().max(40).optional(),
    weight: z.coerce.number().nonnegative().optional(),
    stock: z.coerce.number().int().nonnegative().optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.discountPrice === undefined || data.price === undefined || data.discountPrice <= data.price, {
    message: 'Discount price must not exceed the regular price',
    path: ['discountPrice'],
  });

export const productQuerySchema = paginationQuerySchema.extend({
  category: objectId.optional(),
  isActive: booleanQueryParam,
  isFeatured: booleanQueryParam,
  search: z.string().trim().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc']).optional().default('newest'),
});

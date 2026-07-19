import { z } from 'zod';
import { paginationQuerySchema, booleanQueryParam } from './common.schemas';

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  slug: z.string().trim().toLowerCase().min(2).max(100).optional(),
  description: z.string().trim().max(2000).optional().default(''),
  image: z
    .union([z.literal(''), z.string().trim().url('Image must be a valid URL')])
    .optional()
    .default(''),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryQuerySchema = paginationQuerySchema.extend({
  isActive: booleanQueryParam,
  isFeatured: booleanQueryParam,
  search: z.string().trim().optional(),
});

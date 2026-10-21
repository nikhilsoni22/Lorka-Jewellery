import { z } from 'zod';
import { paginationQuerySchema, booleanQueryParam } from './common.schemas';
import { UserRole } from './enums';

export const userQuerySchema = paginationQuerySchema.extend({
  role: z.nativeEnum(UserRole).optional(),
  isBlocked: booleanQueryParam,
  search: z.string().trim().optional(),
});

export const setUserBlockedSchema = z.object({
  blocked: z.boolean(),
  /** Shown to the customer on the website. */
  reason: z.string().trim().max(300).optional().default(''),
});

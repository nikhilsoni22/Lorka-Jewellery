import { z } from 'zod';

/** Shared pagination query params — coerced from query-string values. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const booleanQueryParam = z
  .union([z.literal('true'), z.literal('false')])
  .transform((v) => v === 'true')
  .optional();

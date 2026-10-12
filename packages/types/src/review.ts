import { z } from 'zod';
import { paginationQuerySchema, booleanQueryParam } from './common.schemas';

export const MAX_REVIEW_IMAGES = 3;

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Please choose a rating').max(5),
  title: z.string().trim().max(100).optional().default(''),
  comment: z.string().trim().min(3, 'Please write a few words').max(2000),
  images: z
    .array(z.string().trim().url())
    .max(MAX_REVIEW_IMAGES, `Up to ${MAX_REVIEW_IMAGES} photos`)
    .optional()
    .default([]),
});

export const updateReviewSchema = z.object({
  isVisible: z.boolean(),
});

export const reviewQuerySchema = paginationQuerySchema.extend({
  isVisible: booleanQueryParam,
  search: z.string().trim().optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ReviewQuery = z.infer<typeof reviewQuerySchema>;

export interface ReviewResponse {
  id: string;
  productId: string;
  productName: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  /** The reviewer has a delivered order containing this product. */
  verifiedBuyer: boolean;
  isVisible: boolean;
  createdAt: string;
}

export interface ReviewSummaryResponse {
  average: number;
  count: number;
  /** Count of visible reviews per star, index 0 = 1 star … index 4 = 5 stars. */
  distribution: [number, number, number, number, number];
}

export interface ProductReviewsResponse {
  summary: ReviewSummaryResponse;
  reviews: ReviewResponse[];
}

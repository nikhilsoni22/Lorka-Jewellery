import { Router } from 'express';
import { createReviewSchema, updateReviewSchema, reviewQuerySchema, UserRole } from '@lorka/types';
import { validate } from '../../common/middleware/validate';
import { authGuard, roleGuard } from '../../common/middleware/auth';
import { reviewLimiter } from '../../common/middleware/rate-limit';
import { asyncHandler } from '../../common/response/api-response';
import { reviewImagesUpload } from '../upload/upload.middleware';
import type { ReviewController } from './review.controller';

export function createReviewRouter(c: ReviewController): Router {
  const router = Router();
  const adminOnly = [authGuard, roleGuard(UserRole.Admin, UserRole.SuperAdmin)];

  // Public / customer
  router.get('/product/:productId', asyncHandler(c.forProduct));
  router.post('/product/:productId', authGuard, reviewLimiter, validate(createReviewSchema), asyncHandler(c.create));
  router.post('/images', authGuard, reviewLimiter, reviewImagesUpload, asyncHandler(c.uploadImages));

  // Admin
  router.get('/', ...adminOnly, validate(reviewQuerySchema, 'query'), asyncHandler(c.list));
  router.patch('/:id', ...adminOnly, validate(updateReviewSchema), asyncHandler(c.update));
  router.delete('/:id', ...adminOnly, asyncHandler(c.delete));

  return router;
}

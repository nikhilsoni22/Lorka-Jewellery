import { Router } from 'express';
import { createProductSchema, updateProductSchema, productQuerySchema, UserRole } from '@lorka/types';
import { validate } from '../../common/middleware/validate';
import { authGuard, roleGuard } from '../../common/middleware/auth';
import { asyncHandler } from '../../common/response/api-response';
import type { ProductController } from './product.controller';

export function createProductRouter(c: ProductController): Router {
  const router = Router();
  const adminOnly = [authGuard, roleGuard(UserRole.Admin, UserRole.SuperAdmin)];

  // Public
  router.get('/', validate(productQuerySchema, 'query'), asyncHandler(c.list));
  router.get('/slug/:slug', asyncHandler(c.getBySlug));

  // Admin
  router.get('/:id', ...adminOnly, asyncHandler(c.getById));
  router.post('/', ...adminOnly, validate(createProductSchema), asyncHandler(c.create));
  router.put('/:id', ...adminOnly, validate(updateProductSchema), asyncHandler(c.update));
  router.delete('/:id', ...adminOnly, asyncHandler(c.delete));

  return router;
}

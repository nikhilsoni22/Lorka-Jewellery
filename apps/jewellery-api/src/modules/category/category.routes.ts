import { Router } from 'express';
import { createCategorySchema, updateCategorySchema, categoryQuerySchema, UserRole } from '@lorka/types';
import { validate } from '../../common/middleware/validate';
import { authGuard, roleGuard } from '../../common/middleware/auth';
import { asyncHandler } from '../../common/response/api-response';
import type { CategoryController } from './category.controller';

export function createCategoryRouter(c: CategoryController): Router {
  const router = Router();
  const adminOnly = [authGuard, roleGuard(UserRole.Admin, UserRole.SuperAdmin)];

  // Public
  router.get('/', validate(categoryQuerySchema, 'query'), asyncHandler(c.list));
  router.get('/slug/:slug', asyncHandler(c.getBySlug));

  // Admin
  router.get('/:id', ...adminOnly, asyncHandler(c.getById));
  router.post('/', ...adminOnly, validate(createCategorySchema), asyncHandler(c.create));
  router.put('/:id', ...adminOnly, validate(updateCategorySchema), asyncHandler(c.update));
  router.delete('/:id', ...adminOnly, asyncHandler(c.delete));

  return router;
}

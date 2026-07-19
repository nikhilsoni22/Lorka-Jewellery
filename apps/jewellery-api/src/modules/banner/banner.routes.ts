import { Router } from 'express';
import { createBannerSchema, updateBannerSchema, bannerQuerySchema, UserRole } from '@lorka/types';
import { validate } from '../../common/middleware/validate';
import { authGuard, roleGuard } from '../../common/middleware/auth';
import { asyncHandler } from '../../common/response/api-response';
import type { BannerController } from './banner.controller';

export function createBannerRouter(c: BannerController): Router {
  const router = Router();
  const adminOnly = [authGuard, roleGuard(UserRole.Admin, UserRole.SuperAdmin)];

  // Public — only active, in-schedule banners
  router.get('/', validate(bannerQuerySchema, 'query'), asyncHandler(c.listPublic));

  // Admin — every banner regardless of active/schedule state
  router.get('/all', ...adminOnly, asyncHandler(c.listAll));
  router.get('/:id', ...adminOnly, asyncHandler(c.getById));
  router.post('/', ...adminOnly, validate(createBannerSchema), asyncHandler(c.create));
  router.put('/:id', ...adminOnly, validate(updateBannerSchema), asyncHandler(c.update));
  router.delete('/:id', ...adminOnly, asyncHandler(c.delete));

  return router;
}

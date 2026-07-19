import { Router } from 'express';
import { UserRole } from '@lorka/types';
import { authGuard, roleGuard } from '../../common/middleware/auth';
import { asyncHandler } from '../../common/response/api-response';
import { productImagesUpload, bannerImageUpload } from './upload.middleware';
import type { UploadController } from './upload.controller';

export function createUploadRouter(c: UploadController): Router {
  const router = Router();
  const adminOnly = [authGuard, roleGuard(UserRole.Admin, UserRole.SuperAdmin)];

  router.post('/products', ...adminOnly, productImagesUpload, asyncHandler(c.uploadProductImages));
  router.post('/banners', ...adminOnly, bannerImageUpload, asyncHandler(c.uploadBannerImage));

  return router;
}

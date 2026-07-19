import { Router } from 'express';
import { updateSettingsSchema, UserRole } from '@lorka/types';
import { validate } from '../../common/middleware/validate';
import { authGuard, roleGuard } from '../../common/middleware/auth';
import { asyncHandler } from '../../common/response/api-response';
import type { SettingsController } from './settings.controller';

export function createSettingsRouter(c: SettingsController): Router {
  const router = Router();
  const adminOnly = [authGuard, roleGuard(UserRole.Admin, UserRole.SuperAdmin)];

  // Public — the website reads active charges (for the checkout bill) and the
  // maintenance-mode window without needing to log in.
  router.get('/', asyncHandler(c.get));

  router.put('/', ...adminOnly, validate(updateSettingsSchema), asyncHandler(c.update));

  return router;
}

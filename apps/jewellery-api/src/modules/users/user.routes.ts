import { Router } from 'express';
import { setUserBlockedSchema, userQuerySchema, UserRole } from '@lorka/types';
import { validate } from '../../common/middleware/validate';
import { authGuard, roleGuard } from '../../common/middleware/auth';
import { asyncHandler } from '../../common/response/api-response';
import type { UserController } from './user.controller';

export function createUserRouter(c: UserController): Router {
  const router = Router();
  const adminOnly = [authGuard, roleGuard(UserRole.Admin, UserRole.SuperAdmin)];

  router.get('/', ...adminOnly, validate(userQuerySchema, 'query'), asyncHandler(c.list));
  router.patch('/:id/block', ...adminOnly, validate(setUserBlockedSchema), asyncHandler(c.setBlocked));

  return router;
}

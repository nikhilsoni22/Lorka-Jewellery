import { Router } from 'express';
import { createTicketSchema, updateTicketStatusSchema, ticketQuerySchema, UserRole } from '@lorka/types';
import { validate } from '../../common/middleware/validate';
import { authGuard, roleGuard } from '../../common/middleware/auth';
import { asyncHandler } from '../../common/response/api-response';
import type { TicketController } from './ticket.controller';

export function createTicketRouter(c: TicketController): Router {
  const router = Router();
  const adminOnly = [authGuard, roleGuard(UserRole.Admin, UserRole.SuperAdmin)];

  // Customer — must be registered before the admin `/:id` route so
  // Express doesn't swallow `/mine` as an `:id` param.
  router.get('/mine', authGuard, validate(ticketQuerySchema, 'query'), asyncHandler(c.mine));
  router.post('/', authGuard, validate(createTicketSchema), asyncHandler(c.create));

  // Admin
  router.get('/', ...adminOnly, validate(ticketQuerySchema, 'query'), asyncHandler(c.list));
  router.get('/:id', ...adminOnly, asyncHandler(c.getById));
  router.patch('/:id/status', ...adminOnly, validate(updateTicketStatusSchema), asyncHandler(c.updateStatus));

  return router;
}

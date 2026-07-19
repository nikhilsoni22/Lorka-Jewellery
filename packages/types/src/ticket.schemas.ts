import { z } from 'zod';
import { paginationQuerySchema } from './common.schemas';
import { TicketStatus } from './ticket.enums';

export const createTicketSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(140),
  message: z.string().trim().min(1, 'Message is required').max(2000),
});

export const updateTicketStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus),
});

export const ticketQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(TicketStatus).optional(),
  search: z.string().trim().optional(),
});

import type { z } from 'zod';
import type { createTicketSchema, updateTicketStatusSchema, ticketQuerySchema } from './ticket.schemas';

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type TicketQuery = z.infer<typeof ticketQuerySchema>;

export interface TicketResponse {
  id: string;
  subject: string;
  message: string;
  status: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
}

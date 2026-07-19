import { TicketStatus } from '@lorka/types';
import type { CreateTicketInput, UpdateTicketStatusInput, TicketQuery, TicketResponse } from '@lorka/types';
import type { TicketEntity } from '../../common/interfaces/entities';
import type { ITicketRepository, IUserRepository, Pagination } from '../../common/interfaces/repositories';
import { AppError } from '../../common/errors/app-error';

export function toTicketResponse(ticket: TicketEntity): TicketResponse {
  return {
    id: ticket.id,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    customerName: ticket.customerName,
    customerEmail: ticket.customerEmail,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export class TicketService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly users: IUserRepository,
  ) {}

  async create(input: CreateTicketInput, userId: string): Promise<TicketResponse> {
    const user = await this.users.findById(userId);
    if (!user) throw AppError.notFound('User not found');

    const ticket = await this.tickets.create({
      userId,
      subject: input.subject,
      message: input.message,
      status: TicketStatus.Open,
      customerName: user.name,
      customerEmail: user.email,
    });
    return toTicketResponse(ticket);
  }

  async list(query: TicketQuery): Promise<{ items: TicketResponse[]; total: number }> {
    const result = await this.tickets.list(
      { status: query.status, search: query.search },
      { page: query.page, limit: query.limit },
    );
    return { items: result.items.map(toTicketResponse), total: result.total };
  }

  async listMine(userId: string, pagination: Pagination): Promise<{ items: TicketResponse[]; total: number }> {
    const result = await this.tickets.list({ userId }, pagination);
    return { items: result.items.map(toTicketResponse), total: result.total };
  }

  async getById(id: string): Promise<TicketResponse> {
    const ticket = await this.tickets.findById(id);
    if (!ticket) throw AppError.notFound('Ticket not found');
    return toTicketResponse(ticket);
  }

  async updateStatus(id: string, input: UpdateTicketStatusInput): Promise<TicketResponse> {
    const updated = await this.tickets.updateStatus(id, input.status);
    if (!updated) throw AppError.notFound('Ticket not found');
    return toTicketResponse(updated);
  }
}

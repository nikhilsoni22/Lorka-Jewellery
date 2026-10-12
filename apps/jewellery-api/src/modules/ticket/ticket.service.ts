import { TicketStatus } from '@lorka/types';
import type { CreateTicketInput, UpdateTicketStatusInput, TicketQuery, TicketResponse } from '@lorka/types';
import type { TicketEntity } from '../../common/interfaces/entities';
import type {
  IOrderRepository,
  ISettingsRepository,
  ITicketRepository,
  IUserRepository,
  Pagination,
} from '../../common/interfaces/repositories';
import type { IEmailService } from '../../common/interfaces/services';
import { AppError } from '../../common/errors/app-error';
import { logger } from '../../common/logger/logger';

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
    private readonly orders: IOrderRepository,
    private readonly settingsRepo: ISettingsRepository,
    private readonly email: IEmailService,
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
    const response = toTicketResponse(ticket);
    void this.sendAdminNotification(response, userId);
    return response;
  }

  /**
   * Best-effort: emails the admin notification inbox (the one order alerts go to, set in Admin →
   * Settings). Accounts don't store phone/address, so those come from the customer's latest order.
   */
  private async sendAdminNotification(ticket: TicketResponse, userId: string): Promise<void> {
    try {
      const { notificationEmail } = await this.settingsRepo.get();
      if (!notificationEmail) return;
      const { items } = await this.orders.list({ userId }, { page: 1, limit: 1 });
      const latest = items[0];
      await this.email.sendAdminTicketNotification(notificationEmail, {
        ticket,
        customerPhone: latest?.customerPhone,
        shippingAddress: latest?.shippingAddress,
        latestOrderNumber: latest?.orderNumber,
      });
    } catch (err) {
      logger.error({ err, ticketId: ticket.id }, '[ticket] Failed to send admin ticket notification');
    }
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

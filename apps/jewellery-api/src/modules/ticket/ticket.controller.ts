import type { Request, Response } from 'express';
import type { TicketQuery } from '@lorka/types';
import { sendSuccess } from '../../common/response/api-response';
import type { TicketService } from './ticket.service';

export class TicketController {
  constructor(private readonly tickets: TicketService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as TicketQuery;
    const { items, total } = await this.tickets.list(query);
    const totalPages = Math.ceil(total / query.limit) || 1;
    sendSuccess(res, items, 200, undefined, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const ticket = await this.tickets.getById(req.params.id as string);
    sendSuccess(res, ticket);
  };

  mine = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as TicketQuery;
    const { items, total } = await this.tickets.listMine(req.user!.id, {
      page: query.page,
      limit: query.limit,
    });
    const totalPages = Math.ceil(total / query.limit) || 1;
    sendSuccess(res, items, 200, undefined, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const ticket = await this.tickets.create(req.body, req.user!.id);
    sendSuccess(res, ticket, 201);
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const ticket = await this.tickets.updateStatus(req.params.id as string, req.body);
    sendSuccess(res, ticket);
  };
}

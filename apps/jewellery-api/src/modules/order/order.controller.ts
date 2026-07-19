import type { Request, Response } from 'express';
import type { OrderQuery, TrackOrderQuery, SetBuildEtaInput } from '@lorka/types';
import { sendSuccess } from '../../common/response/api-response';
import type { OrderService } from './order.service';

export class OrderController {
  constructor(private readonly orders: OrderService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as OrderQuery;
    const { items, total } = await this.orders.list(query);
    const totalPages = Math.ceil(total / query.limit) || 1;
    sendSuccess(res, items, 200, undefined, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const order = await this.orders.getById(req.params.id as string);
    sendSuccess(res, order);
  };

  mine = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as OrderQuery;
    const { items, total } = await this.orders.listMine(req.user!.id, {
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

  track = async (req: Request, res: Response): Promise<void> => {
    const { orderNumber, phone } = req.query as unknown as TrackOrderQuery;
    const order = await this.orders.track(orderNumber, phone);
    sendSuccess(res, order);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const order = await this.orders.create(req.body, req.user?.id);
    sendSuccess(res, order, 201);
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const order = await this.orders.updateStatus(req.params.id as string, req.body);
    sendSuccess(res, order);
  };

  setBuildEta = async (req: Request, res: Response): Promise<void> => {
    const { estimatedReadyDate } = req.body as SetBuildEtaInput;
    const order = await this.orders.setBuildEta(req.params.id as string, estimatedReadyDate);
    sendSuccess(res, order);
  };
}

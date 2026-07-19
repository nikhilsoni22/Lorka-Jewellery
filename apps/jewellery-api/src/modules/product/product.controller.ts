import type { Request, Response } from 'express';
import type { ProductQuery } from '@lorka/types';
import { sendSuccess } from '../../common/response/api-response';
import type { ProductService } from './product.service';

export class ProductController {
  constructor(private readonly products: ProductService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as ProductQuery;
    const { items, total } = await this.products.list(query);
    const totalPages = Math.ceil(total / query.limit) || 1;
    sendSuccess(res, items, 200, undefined, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const product = await this.products.getById(req.params.id as string);
    sendSuccess(res, product);
  };

  getBySlug = async (req: Request, res: Response): Promise<void> => {
    const product = await this.products.getBySlug(req.params.slug as string);
    sendSuccess(res, product);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const product = await this.products.create(req.body);
    sendSuccess(res, product, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const product = await this.products.update(req.params.id as string, req.body);
    sendSuccess(res, product);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.products.delete(req.params.id as string);
    sendSuccess(res, { deleted: true });
  };
}

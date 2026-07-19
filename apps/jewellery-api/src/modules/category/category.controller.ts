import type { Request, Response } from 'express';
import type { CategoryQuery } from '@lorka/types';
import { sendSuccess } from '../../common/response/api-response';
import type { CategoryService } from './category.service';

export class CategoryController {
  constructor(private readonly categories: CategoryService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as CategoryQuery;
    const { items, total } = await this.categories.list(query);
    const totalPages = Math.ceil(total / query.limit) || 1;
    sendSuccess(res, items, 200, undefined, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const category = await this.categories.getById(req.params.id as string);
    sendSuccess(res, category);
  };

  getBySlug = async (req: Request, res: Response): Promise<void> => {
    const category = await this.categories.getBySlug(req.params.slug as string);
    sendSuccess(res, category);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const category = await this.categories.create(req.body);
    sendSuccess(res, category, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const category = await this.categories.update(req.params.id as string, req.body);
    sendSuccess(res, category);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.categories.delete(req.params.id as string);
    sendSuccess(res, { deleted: true });
  };
}

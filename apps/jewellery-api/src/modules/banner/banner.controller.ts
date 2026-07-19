import type { Request, Response } from 'express';
import type { BannerQuery } from '@lorka/types';
import { sendSuccess } from '../../common/response/api-response';
import type { BannerService } from './banner.service';

export class BannerController {
  constructor(private readonly banners: BannerService) {}

  listPublic = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as BannerQuery;
    const banners = await this.banners.listPublic(query);
    sendSuccess(res, banners);
  };

  listAll = async (_req: Request, res: Response): Promise<void> => {
    const banners = await this.banners.listAll();
    sendSuccess(res, banners);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const banner = await this.banners.getById(req.params.id as string);
    sendSuccess(res, banner);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const banner = await this.banners.create(req.body);
    sendSuccess(res, banner, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const banner = await this.banners.update(req.params.id as string, req.body);
    sendSuccess(res, banner);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.banners.delete(req.params.id as string);
    sendSuccess(res, { deleted: true });
  };
}

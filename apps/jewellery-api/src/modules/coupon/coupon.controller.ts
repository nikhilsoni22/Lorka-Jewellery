import type { Request, Response } from 'express';
import { paginationQuerySchema, type ValidateCouponInput } from '@lorka/types';
import { sendSuccess } from '../../common/response/api-response';
import type { CouponService } from './coupon.service';

export class CouponController {
  constructor(private readonly coupons: CouponService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = paginationQuerySchema.parse(req.query);
    const { items, total } = await this.coupons.list({ page, limit });
    sendSuccess(res, items, 200, undefined, { page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.coupons.create(req.body), 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.coupons.update(req.params.id as string, req.body));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.coupons.delete(req.params.id as string);
    sendSuccess(res, null);
  };

  validate = async (req: Request, res: Response): Promise<void> => {
    const { code, subtotal } = req.body as ValidateCouponInput;
    sendSuccess(res, await this.coupons.validate(code, subtotal));
  };
}

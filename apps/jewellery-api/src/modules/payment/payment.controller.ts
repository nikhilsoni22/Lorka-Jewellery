import type { Request, Response } from 'express';
import type { CreateRazorpayOrderInput } from '@lorka/types';
import { sendSuccess } from '../../common/response/api-response';
import type { PaymentService } from './payment.service';

export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  createRazorpayOrder = async (req: Request, res: Response): Promise<void> => {
    const { items } = req.body as CreateRazorpayOrderInput;
    const order = await this.payments.createRazorpayOrder(items);
    sendSuccess(res, order, 201);
  };
}

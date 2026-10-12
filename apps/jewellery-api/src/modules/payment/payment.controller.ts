import type { Request, Response } from 'express';
import type { CreateRazorpayOrderInput } from '@lorka/types';
import { sendSuccess } from '../../common/response/api-response';
import type { PaymentService } from './payment.service';

export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  createRazorpayOrder = async (req: Request, res: Response): Promise<void> => {
    const order = await this.payments.createRazorpayOrder(req.body as CreateRazorpayOrderInput, req.user?.id);
    sendSuccess(res, order, 201);
  };

  razorpayWebhook = async (req: Request, res: Response): Promise<void> => {
    await this.payments.handleWebhook(req.rawBody, req.get('x-razorpay-signature'));
    sendSuccess(res, { received: true });
  };
}

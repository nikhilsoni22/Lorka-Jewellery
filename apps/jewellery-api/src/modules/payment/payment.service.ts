import type { CreateRazorpayOrderInput, RazorpayOrderResponse } from '@lorka/types';
import type { IProductRepository, ISettingsRepository } from '../../common/interfaces/repositories';
import { AppError } from '../../common/errors/app-error';
import { env } from '../../config/env';
import { computeCharges, sumCharges } from '../../common/utils/pricing';
import { createRazorpayOrder } from './razorpay.client';

function generateReceipt(): string {
  return `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class PaymentService {
  constructor(
    private readonly products: IProductRepository,
    private readonly settingsRepo: ISettingsRepository,
  ) {}

  async createRazorpayOrder(items: CreateRazorpayOrderInput['items']): Promise<RazorpayOrderResponse> {
    const products = await Promise.all(items.map((item) => this.products.findById(item.productId)));

    let subtotal = 0;
    items.forEach((item, idx) => {
      const product = products[idx];
      if (!product || !product.isActive) {
        throw AppError.badRequest('One of the selected products is no longer available');
      }
      if (!item.isBuildOrder && product.stock < item.quantity) {
        throw AppError.conflict(`${product.name} only has ${product.stock} left in stock`);
      }
      const unitPrice = product.discountPrice ?? product.price;
      subtotal += unitPrice * item.quantity;
    });

    if (subtotal <= 0) {
      throw AppError.badRequest('Order total must be greater than zero');
    }

    const settings = await this.settingsRepo.get();
    const charges = computeCharges(subtotal, settings.charges);
    const total = subtotal + sumCharges(charges);

    const amountPaise = Math.round(total * 100);
    const razorpayOrder = await createRazorpayOrder(amountPaise, generateReceipt());

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: env.RAZORPAY_KEY_ID,
    };
  }
}

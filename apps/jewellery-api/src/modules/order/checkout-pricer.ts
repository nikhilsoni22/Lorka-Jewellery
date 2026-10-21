import { COD_FEE_LABEL, paymentAdjustment, type CheckoutDetailsInput, type PaymentMethod } from '@lorka/types';
import type { OrderChargeEntity, OrderItemEntity, SettingsEntity } from '../../common/interfaces/entities';
import type { IProductRepository, ISettingsRepository } from '../../common/interfaces/repositories';
import { AppError } from '../../common/errors/app-error';
import {
  computeCharges,
  computeDiscountedPrice,
  computeProductPrice,
  sumCharges,
} from '../../common/utils/pricing';
import type { CouponService } from '../coupon/coupon.service';

export interface PricedCheckout {
  settings: SettingsEntity;
  items: OrderItemEntity[];
  subtotal: number;
  couponCode?: string;
  discount: number;
  charges: OrderChargeEntity[];
  /** Off for paying up front; a COD fee is a `charges` line instead. */
  prepaidDiscount: number;
  total: number;
  /** Problems that were let through because the customer has already paid (admin must follow up). */
  warnings: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Prices a cart exactly the same way for the Razorpay amount and for the final order, so what the
 * customer pays always matches the order total.
 */
export class CheckoutPricer {
  constructor(
    private readonly products: IProductRepository,
    private readonly settingsRepo: ISettingsRepository,
    private readonly coupons: CouponService,
  ) {}

  /**
   * `paid`: the customer has already paid this amount online. Availability problems (product
   * hidden, stock gone, coupon used up) then become warnings for the admin instead of errors —
   * rejecting the order would leave the customer charged with no order.
   */
  async price(
    input: Pick<CheckoutDetailsInput, 'items' | 'couponCode'>,
    method: PaymentMethod,
    paid = false,
  ): Promise<PricedCheckout> {
    const settings = await this.settingsRepo.get();
    const rates = { silverRatePerKg: settings.silverRatePerKg, goldRatePer10g: settings.goldRatePer10g };
    const products = await Promise.all(input.items.map((item) => this.products.findById(item.productId)));
    const warnings: string[] = [];

    const items = input.items.map((item, idx) => {
      const product = products[idx];
      if (!product) throw AppError.badRequest('One of the selected products is no longer available');
      if (!product.isActive) {
        if (!paid) throw AppError.badRequest('One of the selected products is no longer available');
        warnings.push(`${product.name} was hidden from the store after the customer paid.`);
      }
      // Build-on-request items are made to order, so the current stock count doesn't gate them.
      if (!item.isBuildOrder && product.stock < item.quantity) {
        if (!paid) throw AppError.conflict(`${product.name} only has ${product.stock} left in stock`);
        warnings.push(`${product.name}: ${item.quantity} paid for, but only ${product.stock} in stock.`);
      }
      const livePrice = computeProductPrice(product.weight, product.makingCharge, product.metalType, rates);
      const unitPrice = computeDiscountedPrice(livePrice, product.discountPercent) ?? livePrice;
      return {
        productId: product.id,
        name: product.name,
        image: product.images[0] ?? '',
        unitPrice,
        quantity: item.quantity,
        subtotal: round2(unitPrice * item.quantity),
        isBuildOrder: item.isBuildOrder,
      };
    });

    const subtotal = round2(items.reduce((sum, item) => sum + item.subtotal, 0));
    let coupon: { code: string; discount: number } | undefined;
    if (input.couponCode) {
      try {
        coupon = await this.coupons.resolve(input.couponCode, subtotal, paid);
      } catch (err) {
        if (!paid) throw err;
        warnings.push(`Coupon ${input.couponCode} no longer exists, so the order total may differ from the amount paid.`);
      }
    }
    const discount = coupon?.discount ?? 0;
    // Charges (e.g. a percentage fee) apply to what the customer actually pays for the goods.
    const goods = subtotal - discount;
    const charges = computeCharges(goods, settings.charges);
    const { codFee, prepaidDiscount } = paymentAdjustment(method, goods, settings.paymentPricing);
    if (codFee > 0) charges.push({ name: COD_FEE_LABEL, amount: codFee });
    const total = round2(goods + sumCharges(charges) - prepaidDiscount);

    return { settings, items, subtotal, couponCode: coupon?.code, discount, charges, prepaidDiscount, total, warnings };
  }
}

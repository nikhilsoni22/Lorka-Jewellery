import type {
  CouponResponse,
  CouponValidationResponse,
  CreateCouponInput,
  UpdateCouponInput,
} from '@lorka/types';
import type { CouponEntity } from '../../common/interfaces/entities';
import type { ICouponRepository, Pagination } from '../../common/interfaces/repositories';
import { AppError } from '../../common/errors/app-error';
import { computeCouponDiscount } from '../../common/utils/pricing';

export function toCouponResponse(coupon: CouponEntity): CouponResponse {
  return {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    type: coupon.type,
    value: coupon.value,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscount: coupon.maxDiscount,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
    isActive: coupon.isActive,
    createdAt: coupon.createdAt.toISOString(),
    updatedAt: coupon.updatedAt.toISOString(),
  };
}

export interface ResolvedCoupon {
  code: string;
  discount: number;
}

export class CouponService {
  constructor(private readonly coupons: ICouponRepository) {}

  async list(pagination: Pagination): Promise<{ items: CouponResponse[]; total: number }> {
    const result = await this.coupons.list(pagination);
    return { items: result.items.map(toCouponResponse), total: result.total };
  }

  async create(input: CreateCouponInput): Promise<CouponResponse> {
    if (await this.coupons.findByCode(input.code)) {
      throw AppError.conflict('A coupon with this code already exists');
    }
    const coupon = await this.coupons.create({
      code: input.code,
      description: input.description,
      type: input.type,
      value: input.value,
      minOrderAmount: input.minOrderAmount,
      maxDiscount: input.maxDiscount ?? null,
      usageLimit: input.usageLimit ?? null,
      expiresAt: input.expiresAt ?? null,
      isActive: input.isActive,
    });
    return toCouponResponse(coupon);
  }

  async update(id: string, input: UpdateCouponInput): Promise<CouponResponse> {
    if (input.code) {
      const clash = await this.coupons.findByCode(input.code);
      if (clash && clash.id !== id) throw AppError.conflict('A coupon with this code already exists');
    }
    const updated = await this.coupons.update(id, input);
    if (!updated) throw AppError.notFound('Coupon not found');
    return toCouponResponse(updated);
  }

  async delete(id: string): Promise<void> {
    if (!(await this.coupons.delete(id))) throw AppError.notFound('Coupon not found');
  }

  /** Public check from the checkout page, before the order is placed. */
  async validate(code: string, subtotal: number): Promise<CouponValidationResponse> {
    const coupon = await this.coupons.findByCode(code);
    const { discount } = this.assertUsable(coupon, subtotal);
    return { code: coupon!.code, discount, description: coupon!.description };
  }

  /**
   * Works out the discount for an order. `lenient` is for already-paid orders: the customer paid
   * the discounted amount, so the coupon must still apply even if it expired or ran out since.
   */
  async resolve(code: string, subtotal: number, lenient = false): Promise<ResolvedCoupon> {
    const coupon = await this.coupons.findByCode(code);
    if (lenient && coupon) return { code: coupon.code, discount: computeCouponDiscount(subtotal, coupon) };
    return { code: coupon!.code, ...this.assertUsable(coupon, subtotal) };
  }

  /** Counts a use once the order exists. Returns false if the coupon ran out in the meantime. */
  redeem(code: string, force = false): Promise<boolean> {
    return force ? this.coupons.forceRedeem(code).then(() => true) : this.coupons.redeem(code);
  }

  release(code: string): Promise<void> {
    return this.coupons.release(code);
  }

  private assertUsable(coupon: CouponEntity | null, subtotal: number): { discount: number } {
    if (!coupon || !coupon.isActive) throw AppError.badRequest('This coupon code is not valid');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw AppError.badRequest('This coupon has expired');
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw AppError.badRequest('This coupon has been fully redeemed');
    }
    if (subtotal < coupon.minOrderAmount) {
      throw AppError.badRequest(`Add items worth ₹${coupon.minOrderAmount} or more to use this coupon`);
    }
    return { discount: computeCouponDiscount(subtotal, coupon) };
  }
}

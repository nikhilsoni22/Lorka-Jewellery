import { ChargeType, MetalType } from '@lorka/types';
import type { ChargeEntity, OrderChargeEntity } from '../interfaces/entities';
import type { MetalRates } from '../interfaces/repositories';

/**
 * Live product price: weight (grams) × the admin-set per-gram rate for its metal, plus the
 * making charge. Silver is quoted per kg (1000g); gold follows the Indian convention of being
 * quoted per 10g — the two rates are NOT interchangeable units.
 */
export function computeProductPrice(
  weightGrams: number,
  makingCharge: number,
  metalType: MetalType,
  rates: MetalRates,
): number {
  const metalCost =
    metalType === MetalType.Gold
      ? (rates.goldRatePer10g / 10) * weightGrams
      : (rates.silverRatePerKg / 1000) * weightGrams;
  return Math.round((metalCost + makingCharge) * 100) / 100;
}

/** Applies an optional offer percentage (1-100) to the live price. Returns undefined when
 * there's no active offer, so callers can fall back to the full price with `?? price`. */
export function computeDiscountedPrice(price: number, discountPercent?: number | null): number | undefined {
  if (!discountPercent) return undefined;
  return Math.round(price * (1 - discountPercent / 100) * 100) / 100;
}

/** Resolves each active admin-configured charge into a concrete rupee amount for this subtotal. */
export function computeCharges(subtotal: number, charges: ChargeEntity[]): OrderChargeEntity[] {
  return charges
    .filter((c) => c.isActive)
    .map((c) => ({
      name: c.name,
      amount:
        Math.round((c.type === ChargeType.Percentage ? (subtotal * c.value) / 100 : c.value) * 100) / 100,
    }));
}

export function sumCharges(charges: OrderChargeEntity[]): number {
  return charges.reduce((sum, c) => sum + c.amount, 0);
}

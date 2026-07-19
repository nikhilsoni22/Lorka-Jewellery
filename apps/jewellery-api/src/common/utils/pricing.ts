import { ChargeType } from '@lorka/types';
import type { ChargeEntity, OrderChargeEntity } from '../interfaces/entities';

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

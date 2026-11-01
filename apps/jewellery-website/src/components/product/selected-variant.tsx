'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ProductResponse, ProductVariantResponse } from '@lorka/types';
import { productVariants } from '@/lib/product-variants';
import { cn } from '@/lib/utils';

/** Only a handful left — worth nudging the customer. */
const LOW_STOCK = 3;

interface SelectedVariantValue {
  variant: ProductVariantResponse;
  select: (weight: number) => void;
}

const SelectedVariantContext = createContext<SelectedVariantValue | null>(null);

/** Which weight the customer has picked on the product page; everything priced or stocked reads it.
 * Starts on the lightest weight — the "from" price shown on the product card. */
export function SelectedVariantProvider({ product, children }: { product: ProductResponse; children: ReactNode }) {
  const variants = productVariants(product);
  const [weight, setWeight] = useState(variants[0]!.weight);
  const variant = variants.find((v) => v.weight === weight) ?? variants[0]!;
  return (
    <SelectedVariantContext.Provider value={{ variant, select: setWeight }}>{children}</SelectedVariantContext.Provider>
  );
}

export function useSelectedVariant(): SelectedVariantValue {
  const ctx = useContext(SelectedVariantContext);
  if (!ctx) throw new Error('useSelectedVariant must be used within a SelectedVariantProvider');
  return ctx;
}

export function VariantPrice({ discountPercent }: { discountPercent?: number | null }) {
  const { variant } = useSelectedVariant();
  const hasDiscount = Boolean(variant.discountPrice && variant.discountPrice < variant.price);
  return hasDiscount ? (
    <div className="flex flex-wrap items-baseline gap-3">
      <span className="font-serif text-3xl">₹{variant.discountPrice}</span>
      <span className="text-lg text-muted-foreground line-through">₹{variant.price}</span>
      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-sm font-medium text-red-600">
        {discountPercent}% OFF
      </span>
    </div>
  ) : (
    <span className="font-serif text-3xl">₹{variant.price}</span>
  );
}

/** Weight chips — only shown when the product comes in more than one weight. */
export function WeightSelector({ product }: { product: ProductResponse }) {
  const { variant: selected, select } = useSelectedVariant();
  const variants = productVariants(product);
  if (variants.length < 2) return null;

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Weight: <span className="font-medium text-foreground">{selected.weight}g</span>
      </p>
      <div role="radiogroup" aria-label="Weight" className="mt-2 flex flex-wrap gap-2">
        {variants.map((v) => {
          const isSelected = v.weight === selected.weight;
          return (
            <button
              key={v.weight}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => select(v.weight)}
              className={cn(
                'min-w-[4.5rem] rounded-md border px-4 py-2 text-sm transition-colors',
                isSelected ? 'border-gold bg-secondary font-medium text-foreground' : 'border-border hover:border-gold/60',
                v.stock === 0 && !isSelected && 'text-muted-foreground',
              )}
            >
              {v.weight}g
              {v.stock === 0 && <span className="block text-[10px] uppercase tracking-wide">Made to order</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Weight and availability rows of the product's spec list, for the selected weight. */
export function VariantSpecs() {
  const { variant } = useSelectedVariant();
  const lowStock = variant.stock > 0 && variant.stock <= LOW_STOCK;
  return (
    <>
      <div>
        <dt className="text-muted-foreground">Weight</dt>
        <dd className="mt-0.5">{variant.weight}g</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Availability</dt>
        <dd className={lowStock ? 'mt-0.5 font-medium text-red-600' : 'mt-0.5'}>
          {variant.stock === 0 ? 'Build to Order' : lowStock ? `Only ${variant.stock} left` : 'In stock'}
        </dd>
      </div>
    </>
  );
}

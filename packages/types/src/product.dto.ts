import type { z } from 'zod';
import type { createProductSchema, updateProductSchema, productQuerySchema } from './product.schemas';

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;

export interface ProductResponse {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  categoryName?: string;
  sku: string;
  metalType: string;
  /** Rupees per gram, as entered by the admin. */
  makingChargePerGram: number;
  /** Offer percentage (1-100) as entered by the admin; null/undefined means no active offer. */
  discountPercent?: number | null;
  /** Every weight the product comes in, lightest first. Always at least one. */
  variants: ProductVariantResponse[];
  /** The lightest weight — `price`, `discountPrice` and `priceBreakup` below are for this
   * weight, so they're the product's "from" price when it comes in more than one. */
  weight: number;
  price: number;
  discountPrice?: number;
  priceBreakup: ProductPriceBreakup;
  /** Total across every weight — 0 means none of them is in stock. */
  stock: number;
  images: string[];
  material: string;
  purity: string;
  isFeatured: boolean;
  isActive: boolean;
  /** Average of visible reviews (0 when there are none). */
  ratingAvg: number;
  ratingCount: number;
  /** Units sold across all orders — drives the "Bestseller" badge and "Popular" sort. */
  soldCount: number;
  createdAt: string;
  updatedAt: string;
}

/** One weight a product comes in, with its own live price and stock. */
export interface ProductVariantResponse {
  weight: number;
  stock: number;
  /** Derived live from weight × (the admin-set metal rate + makingChargePerGram) — not stored. */
  price: number;
  /** Derived: price after applying the product's discountPercent. Undefined when there's no active offer. */
  discountPrice?: number;
  /** Shown to customers so they can see exactly how the price is made up. */
  priceBreakup: ProductPriceBreakup;
}

export interface ProductPriceBreakup {
  /** Rate the metal value was computed from, per gram. */
  metalRatePerGram: number;
  metalValue: number;
  makingChargePerGram: number;
  /** weight × makingChargePerGram. */
  makingCharge: number;
  /** Rupees off from the active offer (0 when there's no offer). */
  offerDiscount: number;
}

/** Units sold at or above which a product is badged "Bestseller". */
export const BESTSELLER_MIN_SOLD = 10;

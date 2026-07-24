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
  makingCharge: number;
  /** Derived live from weight × the admin-set metal rate + makingCharge — not stored. */
  price: number;
  /** Offer percentage (1-100) as entered by the admin; null/undefined means no active offer. */
  discountPercent?: number | null;
  /** Derived: price after applying discountPercent. Undefined when there's no active offer. */
  discountPrice?: number;
  images: string[];
  material: string;
  purity: string;
  weight: number;
  stock: number;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

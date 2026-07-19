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
  price: number;
  discountPrice?: number;
  images: string[];
  material: string;
  purity: string;
  weight?: number;
  stock: number;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

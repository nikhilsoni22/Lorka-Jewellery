import type { ProductResponse, ProductVariantResponse } from '@lorka/types';

/** The weights a product comes in, lightest first. Falls back to the product's single weight when
 * `variants` is missing — an API from before products had several weights, e.g. mid-deploy. */
export function productVariants(product: ProductResponse): ProductVariantResponse[] {
  if (product.variants?.length) return product.variants;
  return [
    {
      weight: product.weight,
      stock: product.stock,
      price: product.price,
      discountPrice: product.discountPrice,
      priceBreakup: product.priceBreakup,
    },
  ];
}

export const hasMultipleWeights = (product: ProductResponse) => productVariants(product).length > 1;

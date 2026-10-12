import type { ProductResponse } from '@lorka/types';

/** Snapshot of a product kept in the browser (wishlist, recently viewed) — enough to render a card. */
export interface SavedProduct {
  id: string;
  slug: string;
  name: string;
  image: string;
  hoverImage?: string;
  price: number;
  discountPrice?: number;
  categoryName?: string;
}

export function toSavedProduct(product: ProductResponse): SavedProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.images[0] ?? '',
    hoverImage: product.images[1],
    price: product.price,
    discountPrice: product.discountPrice,
    categoryName: product.material || product.categoryName,
  };
}

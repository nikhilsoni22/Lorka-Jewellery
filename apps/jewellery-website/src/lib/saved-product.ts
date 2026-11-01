import type { ProductResponse } from '@lorka/types';
import { hasMultipleWeights } from './product-variants';

/** Snapshot of a product kept in the browser (wishlist, recently viewed) — enough to render a card. */
export interface SavedProduct {
  id: string;
  slug: string;
  name: string;
  image: string;
  hoverImage?: string;
  /** For the lightest weight — the "from" price when the product comes in several. */
  price: number;
  discountPrice?: number;
  /** Comes in more than one weight, so the price is shown as "From …". Missing on old snapshots. */
  hasMultipleWeights?: boolean;
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
    hasMultipleWeights: hasMultipleWeights(product),
    categoryName: product.material || product.categoryName,
  };
}

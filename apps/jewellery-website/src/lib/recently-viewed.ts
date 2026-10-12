import type { SavedProduct } from '@/lib/saved-product';

const STORAGE_KEY = 'lorka:recently-viewed';
const MAX_ITEMS = 12;

export function getRecentlyViewed(): SavedProduct[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as SavedProduct[]) : [];
  } catch {
    return [];
  }
}

/** Moves the product to the front of the list (most recent first). */
export function rememberViewed(product: SavedProduct): void {
  try {
    const next = [product, ...getRecentlyViewed().filter((p) => p.id !== product.id)].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — nothing to remember.
  }
}

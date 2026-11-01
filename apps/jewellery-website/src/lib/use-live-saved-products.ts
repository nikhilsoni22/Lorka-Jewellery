'use client';

import { useEffect, useState } from 'react';
import type { ProductResponse } from '@lorka/types';
import { apiClient } from '@/lib/api-client';
import { toSavedProduct, type SavedProduct } from '@/lib/saved-product';

/** The most ids the product list accepts in one request. */
const MAX_IDS = 100;

/**
 * Saved products (wishlist, recently viewed) are snapshots from when they were saved, but prices
 * follow the live metal rate, so a snapshot's price goes stale. Re-reads them from the API and
 * returns them at today's price.
 *
 * Returns `undefined` until the live prices are in, so callers show a placeholder instead of
 * flashing the stale price. Only products not fetched yet are requested — removing one from the
 * list doesn't reload the rest. A product that's gone or hidden (or a failed request) keeps its
 * snapshot.
 */
export function useLiveSavedProducts(items: SavedProduct[]): SavedProduct[] | undefined {
  // id → live product, or null when there's no live version to show.
  const [fetched, setFetched] = useState<Map<string, SavedProduct | null>>(() => new Map());
  const missing = items
    .slice(0, MAX_IDS)
    .map((i) => i.id)
    .filter((id) => !fetched.has(id))
    .join(',');

  useEffect(() => {
    if (!missing) return;
    let cancelled = false;
    const ids = missing.split(',');
    apiClient
      .get<ProductResponse[]>(`/products?ids=${missing}&isActive=true&limit=${MAX_IDS}`)
      .then((products) => new Map(products.map((p) => [p.id, toSavedProduct(p)])))
      .catch(() => new Map<string, SavedProduct>())
      .then((live) => {
        if (cancelled) return;
        setFetched((prev) => {
          const next = new Map(prev);
          for (const id of ids) next.set(id, live.get(id) ?? null);
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [missing]);

  if (missing) return undefined;
  return items.map((item) => fetched.get(item.id) ?? item);
}

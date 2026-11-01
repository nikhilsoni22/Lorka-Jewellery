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
 * returns them at today's price; a product that's gone or hidden (or a failed request) keeps its
 * snapshot.
 */
export function useLiveSavedProducts(items: SavedProduct[]): SavedProduct[] {
  const [live, setLive] = useState<Map<string, SavedProduct>>(() => new Map());
  const ids = items
    .slice(0, MAX_IDS)
    .map((i) => i.id)
    .join(',');

  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    apiClient
      .get<ProductResponse[]>(`/products?ids=${ids}&isActive=true&limit=${MAX_IDS}`)
      .then((products) => {
        if (!cancelled) setLive(new Map(products.map((p) => [p.id, toSavedProduct(p)])));
      })
      .catch(() => {
        // Keep showing the snapshots.
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  return items.map((item) => live.get(item.id) ?? item);
}

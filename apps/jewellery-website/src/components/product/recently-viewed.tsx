'use client';

import { useEffect, useState } from 'react';
import { ProductCardSkeleton, SavedProductCard } from '@/components/product-card';
import { getRecentlyViewed, rememberViewed } from '@/lib/recently-viewed';
import type { SavedProduct } from '@/lib/saved-product';
import { useLiveSavedProducts } from '@/lib/use-live-saved-products';

/** Records this product as viewed, and shows the others the customer looked at recently. */
export function RecentlyViewed({ current }: { current: SavedProduct }) {
  const [saved, setSaved] = useState<SavedProduct[]>([]);
  const items = useLiveSavedProducts(saved);

  useEffect(() => {
    setSaved(getRecentlyViewed().filter((p) => p.id !== current.id).slice(0, 4));
    rememberViewed(current);
    // Re-run only when moving to a different product.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);

  if (saved.length === 0) return null;

  return (
    <section className="border-t border-border pt-12">
      <p className="text-xs font-medium uppercase tracking-[0.35em] text-gold">Your history</p>
      <h2 className="mt-2 text-2xl md:text-3xl">Recently viewed</h2>
      <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {/* Placeholders until today's prices load — the saved ones may be stale. */}
        {items
          ? items.map((p, i) => (
              <div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 70}ms` }}>
                <SavedProductCard product={p} />
              </div>
            ))
          : saved.map((p) => <ProductCardSkeleton key={p.id} />)}
      </div>
    </section>
  );
}

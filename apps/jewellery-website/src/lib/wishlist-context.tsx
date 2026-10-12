'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SavedProduct } from '@/lib/saved-product';

interface WishlistContextValue {
  items: SavedProduct[];
  has: (productId: string) => boolean;
  toggle: (product: SavedProduct) => boolean;
  remove: (productId: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = 'lorka:wishlist';

function readStored(): SavedProduct[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as SavedProduct[]) : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SavedProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStored());
    setHydrated(true);
    // Keep several open tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or blocked — the wishlist just won't persist.
    }
  }, [items, hydrated]);

  const has = useCallback((productId: string) => items.some((i) => i.id === productId), [items]);

  /** Returns true if the product is now in the wishlist. */
  const toggle = useCallback(
    (product: SavedProduct) => {
      const exists = items.some((i) => i.id === product.id);
      setItems((prev) => (exists ? prev.filter((i) => i.id !== product.id) : [product, ...prev]));
      return !exists;
    },
    [items],
  );

  const remove = useCallback((productId: string) => setItems((prev) => prev.filter((i) => i.id !== productId)), []);

  const value = useMemo(() => ({ items, has, toggle, remove }), [items, has, toggle, remove]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
}

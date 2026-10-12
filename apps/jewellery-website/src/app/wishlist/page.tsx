'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/lib/wishlist-context';
import { SavedProductCard } from '@/components/product-card';

export default function WishlistPage() {
  const { items } = useWishlist();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="container py-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-gold">Saved for later</p>
          <h1 className="mt-2 text-3xl">My Wishlist</h1>
        </div>
        {mounted && items.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {!mounted ? null : items.length === 0 ? (
        <div className="mx-auto mt-16 max-w-sm text-center animate-fade-in-up">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-gold">
            <Heart className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <p className="mt-5 font-serif text-xl">Your wishlist is empty</p>
          <p className="mt-2 text-sm text-muted-foreground">Tap the ♡ on any piece you love to save it here.</p>
          <Link
            href="/#categories"
            className="mt-6 inline-flex bg-foreground px-8 py-3 text-xs font-medium uppercase tracking-[0.15em] text-background transition-transform hover:scale-[1.03]"
          >
            Start exploring
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((product, i) => (
            <div key={product.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
              <SavedProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

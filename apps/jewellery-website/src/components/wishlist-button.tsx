'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWishlist } from '@/lib/wishlist-context';
import type { SavedProduct } from '@/lib/saved-product';

export function WishlistButton({
  product,
  variant = 'icon',
  className,
}: {
  product: SavedProduct;
  /** `icon`: round button over a product image. `full`: labelled button for the product page. */
  variant?: 'icon' | 'full';
  className?: string;
}) {
  const { has, toggle } = useWishlist();
  // The wishlist lives in localStorage, so render the "not saved" state until after hydration.
  const [mounted, setMounted] = useState(false);
  const [burst, setBurst] = useState(0);
  useEffect(() => setMounted(true), []);
  const saved = mounted && has(product.id);

  const onClick = (e: React.MouseEvent) => {
    // Cards are links — don't navigate when tapping the heart.
    e.preventDefault();
    e.stopPropagation();
    const added = toggle(product);
    if (added) setBurst((n) => n + 1);
    toast.success(added ? 'Saved to your wishlist' : 'Removed from your wishlist');
  };

  const heart = (
    <Heart
      key={burst}
      className={cn('h-4 w-4 transition-colors', saved ? 'fill-red-500 text-red-500' : '', saved && burst > 0 && 'animate-pop')}
      strokeWidth={1.8}
    />
  );

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
          saved ? 'border-red-200 bg-red-50 text-red-600' : 'border-border hover:border-gold/50 hover:text-gold',
          className,
        )}
      >
        {heart}
        {saved ? 'Saved' : 'Wishlist'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      aria-pressed={saved}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-transform hover:scale-110',
        className,
      )}
    >
      {heart}
    </button>
  );
}

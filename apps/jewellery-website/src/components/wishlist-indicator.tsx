'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/lib/wishlist-context';

export function WishlistIndicator() {
  const { items } = useWishlist();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = mounted ? items.length : 0;

  return (
    <Link
      href="/wishlist"
      aria-label="View wishlist"
      className="relative hidden items-center text-foreground transition-colors hover:text-gold sm:inline-flex"
    >
      <Heart className="h-[18px] w-[18px]" strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute -right-2.5 -top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

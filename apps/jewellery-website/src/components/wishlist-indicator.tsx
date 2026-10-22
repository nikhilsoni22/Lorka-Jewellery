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
      <Heart className="h-5 w-5" strokeWidth={1.3} />
      {count > 0 && (
        <span className="absolute -right-2 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-gold px-1 text-[9px] font-semibold leading-none text-ivory">{count}</span>
      )}
    </Link>
  );
}

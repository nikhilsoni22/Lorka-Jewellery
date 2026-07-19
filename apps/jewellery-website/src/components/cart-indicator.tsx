'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart-context';

export function CartIndicator() {
  const { totalCount } = useCart();

  return (
    <Link
      href="/cart"
      aria-label="View cart"
      className="relative inline-flex items-center text-foreground transition-colors hover:text-gold"
    >
      <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} />
      <span className="absolute -right-2.5 -top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] font-medium text-background">
        {totalCount}
      </span>
    </Link>
  );
}

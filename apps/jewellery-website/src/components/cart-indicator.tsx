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
      <ShoppingBag className="h-5 w-5" strokeWidth={1.3} />
      {totalCount > 0 && <span className="absolute -right-2 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-gold px-1 text-[9px] font-semibold leading-none text-ivory">{totalCount}</span>}
    </Link>
  );
}

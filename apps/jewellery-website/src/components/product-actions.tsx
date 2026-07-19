'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Hammer } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { useCart, type CartItem } from '@/lib/cart-context';

const BUILD_ORDER_MAX_QTY = 10;

export function ProductActions({ product }: { product: ProductResponse }) {
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();
  const router = useRouter();
  const outOfStock = product.stock === 0;
  const maxQty = outOfStock ? BUILD_ORDER_MAX_QTY : product.stock;

  const asCartItem = (): Omit<CartItem, 'quantity'> => ({
    productId: product.id,
    slug: product.slug,
    name: product.name,
    image: product.images[0] ?? '',
    unitPrice: product.discountPrice ?? product.price,
    stock: product.stock,
    isBuildOrder: outOfStock,
  });

  const handleAddToCart = () => {
    addItem(asCartItem(), qty);
    toast.success('Added to cart');
  };

  const handleOrderNow = () => {
    const item: CartItem = { ...asCartItem(), quantity: qty };
    sessionStorage.setItem('lorka:buy-now-item', JSON.stringify(item));
    router.push('/checkout?mode=buynow');
  };

  if (outOfStock) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Quantity</span>
          <div className="flex items-center rounded-md border border-border">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
              disabled={qty <= 1}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-sm">{qty}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
              disabled={qty >= maxQty}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-md border border-gold/30 bg-secondary/40 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Hammer className="h-4 w-4 text-gold" strokeWidth={1.5} />
            Currently out of stock — available to build on request
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Place a build request and our team will confirm your delivery timeline shortly.
          </p>
        </div>

        <Button onClick={handleOrderNow} className="w-full">
          Request a Build
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Quantity</span>
        <div className="flex items-center rounded-md border border-border">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
            disabled={qty <= 1}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm">{qty}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
            disabled={qty >= maxQty}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={handleAddToCart} className="flex-1">
          Add to Cart
        </Button>
        <Button onClick={handleOrderNow} className="flex-1">
          Order Now
        </Button>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-context';

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalPrice } = useCart();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <main className="container py-20 text-center">
        <h1 className="text-3xl">Your cart is empty</h1>
        <p className="mt-3 text-muted-foreground">Browse our collection to find something you love.</p>
        <Link href="/" className="mt-6 inline-block">
          <Button>Continue Shopping</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="container py-12">
      <h1 className="text-3xl">Your Cart</h1>

      <div className="mt-8 space-y-4">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
          >
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1">
              <Link href={`/products/${item.slug}`} className="font-medium hover:text-gold">
                {item.name}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">₹{item.unitPrice}</p>
            </div>
            <div className="flex items-center rounded-md border border-border">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                disabled={item.quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm">{item.quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                disabled={item.quantity >= item.stock}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="w-20 text-right font-serif">₹{item.unitPrice * item.quantity}</p>
            <button
              type="button"
              aria-label="Remove item"
              onClick={() => removeItem(item.productId)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <span className="text-lg">Subtotal</span>
        <span className="font-serif text-2xl">₹{totalPrice}</span>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => router.push('/checkout')}>Proceed to Checkout</Button>
      </div>
    </main>
  );
}

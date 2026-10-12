'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Hammer } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { WishlistButton } from '@/components/wishlist-button';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { useCart, type CartItem } from '@/lib/cart-context';
import { toSavedProduct } from '@/lib/saved-product';
import { optimizedImage } from '@/lib/image';
import { cn } from '@/lib/utils';

const BUILD_ORDER_MAX_QTY = 10;

export function ProductActions({ product, whatsappHref }: { product: ProductResponse; whatsappHref?: string }) {
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();
  const router = useRouter();
  const outOfStock = product.stock === 0;
  const maxQty = outOfStock ? BUILD_ORDER_MAX_QTY : product.stock;
  const price = product.discountPrice ?? product.price;

  // Show the sticky mobile bar once the main buttons scroll out of view.
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const node = buttonsRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowSticky(!entry!.isIntersecting && entry!.boundingClientRect.top < 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const asCartItem = (): Omit<CartItem, 'quantity'> => ({
    productId: product.id,
    slug: product.slug,
    name: product.name,
    image: product.images[0] ?? '',
    unitPrice: price,
    stock: product.stock,
    isBuildOrder: outOfStock,
  });

  const handleAddToCart = () => {
    addItem(asCartItem(), qty);
    toast.success('Added to cart', {
      action: { label: 'View cart', onClick: () => router.push('/cart') },
    });
  };

  const handleOrderNow = () => {
    const item: CartItem = { ...asCartItem(), quantity: qty };
    sessionStorage.setItem('lorka:buy-now-item', JSON.stringify(item));
    router.push('/checkout?mode=buynow');
  };

  const quantityPicker = (
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
  );

  const secondaryActions = (
    <div className="flex gap-3">
      <WishlistButton product={toSavedProduct(product)} variant="full" className="flex-1" />
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-[#25D366]/40 px-4 py-2.5 text-sm font-medium text-[#128C7E] transition-colors hover:bg-[#25D366]/10"
        >
          <WhatsAppIcon className="h-4 w-4" /> Ask on WhatsApp
        </a>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {quantityPicker}

      {outOfStock && (
        <div className="rounded-md border border-gold/30 bg-secondary/40 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Hammer className="h-4 w-4 text-gold" strokeWidth={1.5} />
            Currently out of stock — available to build on request
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Place a build request and our team will confirm your delivery timeline shortly.
          </p>
        </div>
      )}

      <div ref={buttonsRef} className="flex flex-col gap-3 sm:flex-row">
        {outOfStock ? (
          <Button onClick={handleOrderNow} className="w-full">
            Request a Build
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleAddToCart} className="flex-1">
              Add to Cart
            </Button>
            <Button onClick={handleOrderNow} className="flex-1">
              Order Now
            </Button>
          </>
        )}
      </div>

      {secondaryActions}

      {/* Mobile: keep the buy buttons in reach while reading the description and reviews. */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-300 md:hidden',
          showSticky ? 'translate-y-0' : 'translate-y-full',
        )}
        aria-hidden={!showSticky}
      >
        <div className="flex items-center gap-3">
          {product.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={optimizedImage(product.images[0], 120)} alt="" className="h-11 w-11 rounded-md object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="font-serif text-sm">₹{price}</p>
          </div>
          {outOfStock ? (
            <Button onClick={handleOrderNow} className="px-4" tabIndex={showSticky ? 0 : -1}>
              Request Build
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleAddToCart} className="px-3" tabIndex={showSticky ? 0 : -1}>
                Add
              </Button>
              <Button onClick={handleOrderNow} className="px-4" tabIndex={showSticky ? 0 : -1}>
                Buy Now
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

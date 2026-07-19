import Link from 'next/link';
import type { ProductResponse } from '@lorka/types';
import { Badge } from '@/components/ui/badge';

export function ProductCard({ product }: { product: ProductResponse }) {
  const hasDiscount = Boolean(product.discountPrice && product.discountPrice < product.price);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block border border-border bg-card transition-colors duration-300 hover:border-gold/40"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
        )}
        {product.isFeatured && (
          <Badge className="absolute left-3 top-3 bg-gold-gradient text-gold-foreground">Featured</Badge>
        )}
        {product.stock === 0 && (
          <Badge className="absolute right-3 top-3 bg-foreground text-background">Build to Order</Badge>
        )}
      </div>
      <div className="space-y-1 border-t border-border p-4">
        <p className="truncate font-medium">{product.name}</p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {product.material || product.categoryName}
        </p>
        <div className="pt-1">
          {hasDiscount ? (
            <span className="space-x-2">
              <span className="font-serif text-lg">₹{product.discountPrice}</span>
              <span className="text-sm text-muted-foreground line-through">₹{product.price}</span>
            </span>
          ) : (
            <span className="font-serif text-lg">₹{product.price}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

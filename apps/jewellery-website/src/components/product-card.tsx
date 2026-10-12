import Link from 'next/link';
import { BESTSELLER_MIN_SOLD, type ProductResponse } from '@lorka/types';
import { Badge } from '@/components/ui/badge';
import { RatingStars } from '@/components/rating-stars';
import { WishlistButton } from '@/components/wishlist-button';
import { optimizedImage, optimizedSrcSet } from '@/lib/image';
import { toSavedProduct, type SavedProduct } from '@/lib/saved-product';

/** Only a handful left — worth nudging the customer. */
const LOW_STOCK = 3;
const CARD_WIDTHS = [320, 480, 640];
const CARD_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw';

export function ProductCard({ product }: { product: ProductResponse }) {
  return (
    <ProductCardView
      saved={toSavedProduct(product)}
      stock={product.stock}
      isFeatured={product.isFeatured}
      isBestseller={product.soldCount >= BESTSELLER_MIN_SOLD}
      ratingAvg={product.ratingAvg}
      ratingCount={product.ratingCount}
    />
  );
}

/** Card for a saved snapshot (wishlist, recently viewed) — no live stock or rating. */
export function SavedProductCard({ product }: { product: SavedProduct }) {
  return <ProductCardView saved={product} />;
}

function ProductCardView({
  saved,
  stock,
  isFeatured,
  isBestseller,
  ratingAvg = 0,
  ratingCount = 0,
}: {
  saved: SavedProduct;
  stock?: number;
  isFeatured?: boolean;
  isBestseller?: boolean;
  ratingAvg?: number;
  ratingCount?: number;
}) {
  const hasDiscount = Boolean(saved.discountPrice && saved.discountPrice < saved.price);
  const offPercent = hasDiscount ? Math.round(((saved.price - saved.discountPrice!) / saved.price) * 100) : 0;

  return (
    <Link
      href={`/products/${saved.slug}`}
      className="group block border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {saved.image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={optimizedImage(saved.image, 640)}
              srcSet={optimizedSrcSet(saved.image, CARD_WIDTHS)}
              sizes={CARD_SIZES}
              alt={saved.name}
              loading="lazy"
              className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110"
            />
            {saved.hoverImage && (
              // Second photo fades in on hover (desktop) — a quick look at another angle.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={optimizedImage(saved.hoverImage, 640)}
                srcSet={optimizedSrcSet(saved.hoverImage, CARD_WIDTHS)}
                sizes={CARD_SIZES}
                alt=""
                aria-hidden
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
        )}

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {hasDiscount && <Badge className="bg-red-600 text-white">{offPercent}% OFF</Badge>}
          {isBestseller && <Badge className="bg-foreground text-background">Bestseller</Badge>}
          {isFeatured && !isBestseller && <Badge className="bg-gold-gradient text-gold-foreground">Featured</Badge>}
        </div>
        <WishlistButton product={saved} className="absolute right-3 top-3" />

        {stock === 0 && (
          <span className="absolute inset-x-0 bottom-0 bg-foreground/85 py-1.5 text-center text-[10px] font-medium uppercase tracking-[0.15em] text-background">
            Build to Order
          </span>
        )}
        {stock !== undefined && stock > 0 && stock <= LOW_STOCK && (
          <span className="absolute inset-x-0 bottom-0 bg-red-600/90 py-1.5 text-center text-[10px] font-medium uppercase tracking-[0.15em] text-white">
            Only {stock} left
          </span>
        )}
      </div>
      <div className="space-y-1 border-t border-border p-4">
        <p className="truncate font-medium">{saved.name}</p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{saved.categoryName}</p>
        {ratingCount > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RatingStars rating={ratingAvg} className="text-[11px]" />
            <span>({ratingCount})</span>
          </p>
        )}
        <div className="pt-1">
          {hasDiscount ? (
            <span className="space-x-2">
              <span className="font-serif text-lg">₹{saved.discountPrice}</span>
              <span className="text-sm text-muted-foreground line-through">₹{saved.price}</span>
            </span>
          ) : (
            <span className="font-serif text-lg">₹{saved.price}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

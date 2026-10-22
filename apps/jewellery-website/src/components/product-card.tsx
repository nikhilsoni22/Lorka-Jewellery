import Link from 'next/link';
import { BESTSELLER_MIN_SOLD, type ProductResponse } from '@lorka/types';
import { Badge } from '@/components/ui/badge';
import { RatingStars } from '@/components/rating-stars';
import { WishlistButton } from '@/components/wishlist-button';
import { optimizedImage, optimizedSrcSet } from '@/lib/image';
import { toSavedProduct, type SavedProduct } from '@/lib/saved-product';
import { formatPrice } from '@/lib/utils';

/** Only a handful left — worth nudging the customer. */
const LOW_STOCK = 3;
const CARD_WIDTHS = [320, 480, 640];
const CARD_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw';
const BADGE_CLASS = 'rounded-none px-2 py-1 text-[9.5px] font-medium uppercase tracking-[0.18em]';

export function ProductCard({ product }: { product: ProductResponse }) {
  return (
    <ProductCardView
      saved={toSavedProduct(product)}
      stock={product.stock}
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
  isBestseller,
  ratingAvg = 0,
  ratingCount = 0,
}: {
  saved: SavedProduct;
  stock?: number;
  isBestseller?: boolean;
  ratingAvg?: number;
  ratingCount?: number;
}) {
  const hasDiscount = Boolean(saved.discountPrice && saved.discountPrice < saved.price);
  const offPercent = hasDiscount ? Math.round(((saved.price - saved.discountPrice!) / saved.price) * 100) : 0;

  return (
    <Link href={`/products/${saved.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden bg-white ring-1 ring-inset ring-border/60">
        {saved.image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={optimizedImage(saved.image, 640)}
              srcSet={optimizedSrcSet(saved.image, CARD_WIDTHS)}
              sizes={CARD_SIZES}
              alt={saved.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
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
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>
        )}

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {hasDiscount && <Badge className={BADGE_CLASS + ' bg-espresso text-ivory'}>−{offPercent}%</Badge>}
          {isBestseller && <Badge className={BADGE_CLASS + ' bg-gold-light text-espresso'}>Bestseller</Badge>}
        </div>
        <WishlistButton product={saved} className="absolute right-3 top-3" />

        {stock === 0 && (
          <span className="absolute inset-x-0 bottom-0 bg-espresso/80 py-2 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-ivory backdrop-blur-sm">
            Made to Order
          </span>
        )}
        {stock !== undefined && stock > 0 && stock <= LOW_STOCK && (
          <span className="absolute inset-x-0 bottom-0 bg-ivory/90 py-2 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-destructive backdrop-blur-sm">
            Only {stock} left
          </span>
        )}
      </div>

      <div className="pt-4 text-center">
        {saved.categoryName && (
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-gold">{saved.categoryName}</p>
        )}
        <p className="mt-1.5 line-clamp-2 font-serif text-[19px] capitalize leading-snug text-foreground">{saved.name}</p>
        {ratingCount > 0 && (
          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <RatingStars rating={ratingAvg} className="text-[11px]" />
            <span>({ratingCount})</span>
          </p>
        )}
        <p className="mt-2 text-sm">
          {hasDiscount ? (
            <span className="space-x-2">
              <span className="font-medium text-foreground">{formatPrice(saved.discountPrice!)}</span>
              <span className="text-muted-foreground line-through">{formatPrice(saved.price)}</span>
            </span>
          ) : (
            <span className="font-medium text-foreground">{formatPrice(saved.price)}</span>
          )}
        </p>
      </div>
    </Link>
  );
}

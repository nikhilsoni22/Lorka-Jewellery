import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { BadgeCheck, ChevronRight, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import type { ProductResponse, ProductReviewsResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { getSettings, whatsappLink } from '@/lib/store';
import { optimizedImage } from '@/lib/image';
import { toSavedProduct } from '@/lib/saved-product';
import { ProductActions } from '@/components/product-actions';
import { ProductCard } from '@/components/product-card';
import { RatingStars } from '@/components/rating-stars';
import { ProductGallery } from '@/components/product/product-gallery';
import { PriceBreakup } from '@/components/product/price-breakup';
import { SizeGuide } from '@/components/product/size-guide';
import { ProductReviews } from '@/components/product/product-reviews';
import { RecentlyViewed } from '@/components/product/recently-viewed';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const EMPTY_REVIEWS: ProductReviewsResponse = {
  summary: { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] },
  reviews: [],
};

// Shared by generateMetadata and the page, so the product is only fetched once per request.
const getProduct = cache((slug: string) => apiGet<ProductResponse>(`/products/slug/${slug}`).catch(() => null));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: 'Product not found' };
  const description =
    product.shortDescription ||
    product.description.slice(0, 160) ||
    `${product.name} — ${product.material || 'silver'} jewellery from Lorka Jewellers.`;
  const image = product.images[0] ? optimizedImage(product.images[0], 1200) : undefined;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      url: `/products/${product.slug}`,
      type: 'website',
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: { card: 'summary_large_image', title: product.name, description, images: image ? [image] : undefined },
  };
}

function sizeKind(product: ProductResponse): 'ring' | 'bangle' | null {
  const text = `${product.name} ${product.categoryName ?? ''}`.toLowerCase();
  if (/\bbangle|\bkada|\bbracelet/.test(text)) return 'bangle';
  if (/\bring/.test(text)) return 'ring';
  return null;
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [settings, related, reviews] = await Promise.all([
    getSettings(),
    apiGet<ProductResponse[]>(`/products?category=${product.category}&isActive=true&limit=5&sort=popular`).catch(
      () => [] as ProductResponse[],
    ),
    apiGet<ProductReviewsResponse>(`/reviews/product/${product.id}?limit=20`).catch(() => EMPTY_REVIEWS),
  ]);
  const relatedProducts = related.filter((p) => p.id !== product.id).slice(0, 4);
  const hasDiscount = Boolean(product.discountPrice && product.discountPrice < product.price);
  const price = product.discountPrice ?? product.price;
  const productUrl = `${SITE_URL}/products/${product.slug}`;
  const whatsappHref = whatsappLink(
    settings.storeInfo.whatsappNumber,
    `Hi! I'm interested in "${product.name}" (${productUrl}). Could you tell me more?`,
  );
  const kind = sizeKind(product);

  // Structured data so Google can show price, availability and stars in search results.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images.map((src) => optimizedImage(src, 1200)),
    description: product.description || product.shortDescription,
    sku: product.sku,
    brand: { '@type': 'Brand', name: 'Lorka Jewellers' },
    ...(product.material ? { material: product.material } : {}),
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'INR',
      price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(reviews.summary.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: reviews.summary.average,
            reviewCount: reviews.summary.count,
          },
        }
      : {}),
  };

  return (
    <main className="container py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-gold">Home</Link>
        <ChevronRight className="h-3 w-3" />
        {product.categoryName && (
          <>
            <span>{product.categoryName}</span>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div className="space-y-6">
          <div className="animate-fade-in-up">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">
              {product.material || product.categoryName}
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl">{product.name}</h1>
            {reviews.summary.count > 0 && (
              <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold">
                <RatingStars rating={reviews.summary.average} className="text-sm" />
                {reviews.summary.average.toFixed(1)} · {reviews.summary.count} review{reviews.summary.count !== 1 ? 's' : ''}
              </a>
            )}
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            {hasDiscount ? (
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-serif text-3xl">₹{product.discountPrice}</span>
                <span className="text-lg text-muted-foreground line-through">₹{product.price}</span>
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-sm font-medium text-red-600">
                  {product.discountPercent}% OFF
                </span>
              </div>
            ) : (
              <span className="font-serif text-3xl">₹{product.price}</span>
            )}
            <p className="mt-1 text-xs text-muted-foreground">Price based on today&apos;s metal rate · inclusive of making charges</p>
          </div>

          <PriceBreakup product={product} />

          {product.shortDescription && <p className="text-muted-foreground">{product.shortDescription}</p>}

          <dl className="grid grid-cols-2 gap-4 border-y border-border py-4 text-sm">
            {product.material && <Spec label="Material" value={product.material} />}
            {product.purity && <Spec label="Purity" value={product.purity} />}
            {product.weight != null && <Spec label="Weight" value={`${product.weight}g`} />}
            <Spec
              label="Availability"
              value={
                product.stock === 0
                  ? 'Build to Order'
                  : product.stock <= 3
                    ? `Only ${product.stock} left`
                    : 'In stock'
              }
              highlight={product.stock > 0 && product.stock <= 3}
            />
          </dl>

          {kind && <SizeGuide kind={kind} whatsappHref={whatsappHref || undefined} />}

          <ProductActions product={product} whatsappHref={whatsappHref || undefined} />

          <ul className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/50 p-4 text-center text-xs text-muted-foreground">
            <li className="flex flex-col items-center gap-1.5">
              <ShieldCheck className="h-5 w-5 text-gold" strokeWidth={1.5} />
              Secure payment
            </li>
            <li className="flex flex-col items-center gap-1.5">
              {product.purity ? (
                <BadgeCheck className="h-5 w-5 text-gold" strokeWidth={1.5} />
              ) : (
                <Truck className="h-5 w-5 text-gold" strokeWidth={1.5} />
              )}
              {product.purity ? `${product.purity} purity` : 'Live order tracking'}
            </li>
            <li className="flex flex-col items-center gap-1.5">
              <RotateCcw className="h-5 w-5 text-gold" strokeWidth={1.5} />
              <Link href="/policies/refund" className="underline-offset-2 hover:text-gold hover:underline">
                Refund policy
              </Link>
            </li>
          </ul>

          {product.description && (
            <div>
              <h2 className="text-lg">Description</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-16 space-y-16">
        <ProductReviews productId={product.id} productSlug={product.slug} initial={reviews} />

        {relatedProducts.length > 0 && (
          <section className="border-t border-border pt-12">
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-gold">You may also like</p>
            <h2 className="mt-2 text-2xl md:text-3xl">More from {product.categoryName ?? 'this collection'}</h2>
            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        <RecentlyViewed current={toSavedProduct(product)} />
      </div>
    </main>
  );
}

function Spec({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={highlight ? 'mt-0.5 font-medium text-red-600' : 'mt-0.5'}>{value}</dd>
    </div>
  );
}

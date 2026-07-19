import { notFound } from 'next/navigation';
import type { ProductResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { ProductActions } from '@/components/product-actions';

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await apiGet<ProductResponse>(`/products/slug/${slug}`).catch(() => null);
  if (!product) notFound();

  const hasDiscount = Boolean(product.discountPrice && product.discountPrice < product.price);

  return (
    <main className="container py-12">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">
              {product.material || product.categoryName}
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl">{product.name}</h1>
          </div>

          <div>
            {hasDiscount ? (
              <span className="space-x-3">
                <span className="font-serif text-2xl">₹{product.discountPrice}</span>
                <span className="text-lg text-muted-foreground line-through">₹{product.price}</span>
              </span>
            ) : (
              <span className="font-serif text-2xl">₹{product.price}</span>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-muted-foreground">{product.shortDescription}</p>
          )}

          <dl className="grid grid-cols-2 gap-4 border-y border-border py-4 text-sm">
            {product.material && (
              <div>
                <dt className="text-muted-foreground">Material</dt>
                <dd className="mt-0.5">{product.material}</dd>
              </div>
            )}
            {product.purity && (
              <div>
                <dt className="text-muted-foreground">Purity</dt>
                <dd className="mt-0.5">{product.purity}</dd>
              </div>
            )}
            {product.weight != null && (
              <div>
                <dt className="text-muted-foreground">Weight</dt>
                <dd className="mt-0.5">{product.weight}g</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Availability</dt>
              <dd className="mt-0.5">{product.stock > 0 ? 'In stock' : 'Build to Order'}</dd>
            </div>
          </dl>

          {product.description && <p className="text-sm leading-relaxed">{product.description}</p>}

          <ProductActions product={product} />
        </div>
      </div>
    </main>
  );
}

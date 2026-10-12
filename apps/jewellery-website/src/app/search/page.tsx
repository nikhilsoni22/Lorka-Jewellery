import type { Metadata } from 'next';
import type { ProductResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { catalogApiQuery, hasActiveFilters, type CatalogParams } from '@/lib/catalog-query';
import { ProductCard } from '@/components/product-card';
import { Reveal } from '@/components/reveal';
import { SectionHeading } from '@/components/section-heading';
import { CatalogFilters } from '@/components/catalog-filters';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<CatalogParams & { q?: string }>;
}) {
  const { q = '', ...filters } = await searchParams;
  const term = q.trim();
  const extra = catalogApiQuery(filters);

  const products = term
    ? await apiGet<ProductResponse[]>(
        `/products?isActive=true&limit=48&search=${encodeURIComponent(term)}${extra ? `&${extra}` : ''}`,
      ).catch(() => [] as ProductResponse[])
    : [];

  return (
    <main className="container py-12">
      <Reveal>
        <SectionHeading
          eyebrow="Search"
          title={term ? `Results for “${term}”` : 'Search our collection'}
          subtitle={term ? undefined : 'Use the search icon in the header to find a piece.'}
        />
      </Reveal>

      {term && (
        <div className="mt-10">
          <CatalogFilters resultCount={products.length} />
        </div>
      )}

      {term && products.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">
          {hasActiveFilters(filters)
            ? 'No pieces match these filters — try clearing some.'
            : `Nothing matched “${term}”. Try a different word.`}
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product, index) => (
            <Reveal key={product.id} delay={Math.min(index, 8) * 60}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      )}
    </main>
  );
}

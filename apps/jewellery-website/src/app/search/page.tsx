import type { Metadata } from 'next';
import type { ProductResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import { Reveal } from '@/components/reveal';
import { SectionHeading } from '@/components/section-heading';

export const metadata: Metadata = { title: 'Search | Lorka Jewellers' };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const term = q.trim();

  const products = term
    ? await apiGet<ProductResponse[]>(
        `/products?isActive=true&limit=48&search=${encodeURIComponent(term)}`,
      ).catch(() => [] as ProductResponse[])
    : [];

  return (
    <main className="container py-12">
      <Reveal>
        <SectionHeading
          eyebrow="Search"
          title={term ? `Results for “${term}”` : 'Search our collection'}
          subtitle={
            term
              ? `${products.length} piece${products.length === 1 ? '' : 's'} found`
              : 'Use the search icon in the header to find a piece.'
          }
        />
      </Reveal>

      {term && products.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">
          Nothing matched “{term}”. Try a different word.
        </p>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
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

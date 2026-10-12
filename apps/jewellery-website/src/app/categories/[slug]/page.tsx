import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { CategoryResponse, ProductResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { catalogApiQuery, hasActiveFilters, type CatalogParams } from '@/lib/catalog-query';
import { optimizedImage } from '@/lib/image';
import { ProductCard } from '@/components/product-card';
import { Reveal } from '@/components/reveal';
import { SectionHeading } from '@/components/section-heading';
import { CatalogFilters } from '@/components/catalog-filters';

const getCategory = cache((slug: string) =>
  apiGet<CategoryResponse>(`/categories/slug/${slug}`).catch(() => null),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return {};
  const description = category.description || `Shop ${category.name} — handcrafted silver jewellery from Lorka Jewellers.`;
  return {
    title: category.name,
    description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: {
      title: category.name,
      description,
      images: category.image ? [{ url: optimizedImage(category.image, 1200) }] : undefined,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogParams>;
}) {
  const { slug } = await params;
  const filters = await searchParams;
  const category = await getCategory(slug);
  if (!category || !category.isActive) notFound();

  const extra = catalogApiQuery(filters);
  const products = await apiGet<ProductResponse[]>(
    `/products?category=${category.id}&isActive=true&limit=48${extra ? `&${extra}` : ''}`,
  ).catch(() => [] as ProductResponse[]);

  return (
    <main className="container py-12">
      <Reveal>
        <SectionHeading eyebrow="Shop" title={category.name} subtitle={category.description || undefined} />
      </Reveal>

      <div className="mt-10">
        <CatalogFilters resultCount={products.length} />
      </div>

      {products.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">
          {hasActiveFilters(filters) ? 'No pieces match these filters — try clearing some.' : 'No products in this category yet.'}
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

import { notFound } from 'next/navigation';
import type { CategoryResponse, ProductResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import { Reveal } from '@/components/reveal';
import { SectionHeading } from '@/components/section-heading';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await apiGet<CategoryResponse>(`/categories/slug/${slug}`).catch(() => null);
  if (!category || !category.isActive) notFound();

  const products = await apiGet<ProductResponse[]>(
    `/products?category=${category.id}&isActive=true&limit=48`,
  ).catch(() => [] as ProductResponse[]);

  return (
    <main className="container py-12">
      <Reveal>
        <SectionHeading eyebrow="Shop" title={category.name} subtitle={category.description || undefined} />
      </Reveal>

      {products.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">No products in this category yet.</p>
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

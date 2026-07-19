import type { ProductResponse } from '@lorka/types';
import { ProductCard } from './product-card';
import { Reveal } from '@/components/reveal';
import { SectionHeading } from '@/components/section-heading';

export function ProductGrid({
  id,
  eyebrow,
  title,
  products,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  products: ProductResponse[];
}) {
  if (products.length === 0) return null;

  return (
    <section id={id} className="container py-20">
      <Reveal>
        <SectionHeading eyebrow={eyebrow} title={title} />
      </Reveal>
      <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, index) => (
          <Reveal key={product.id} delay={Math.min(index, 8) * 60}>
            <ProductCard product={product} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

import type { ProductResponse } from '@lorka/types';
import { ProductCard } from './product-card';
import { Reveal } from '@/components/reveal';
import { SectionHeading } from '@/components/section-heading';
import { cn } from '@/lib/utils';

/** Up to this many products get the editorial layout (heading beside the cards) instead of a full row. */
const EDITORIAL_MAX = 3;

export function ProductGrid({
  id,
  eyebrow,
  title,
  subtitle,
  products,
  action,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  products: ProductResponse[];
  action?: { label: string; href: string };
}) {
  if (products.length === 0) return null;

  const editorial = products.length <= EDITORIAL_MAX;
  const cards = products.map((product, index) => (
    <Reveal key={product.id} delay={Math.min(index, 8) * 60}>
      <ProductCard product={product} />
    </Reveal>
  ));

  if (editorial) {
    // A short list would leave most of a 4-column row empty — sit the heading beside the cards instead.
    return (
      <section id={id} className="container scroll-mt-24 py-20 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-4">
            <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} action={action} align="left" />
          </Reveal>
          <div
            className={cn(
              'grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:col-span-8',
              products.length === 3 && 'sm:grid-cols-3',
              products.length === 1 && 'max-w-sm',
            )}
          >
            {cards}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={id} className="container scroll-mt-24 py-20 sm:py-24">
      <Reveal>
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} action={action} align="left" />
      </Reveal>
      <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">{cards}</div>
    </section>
  );
}

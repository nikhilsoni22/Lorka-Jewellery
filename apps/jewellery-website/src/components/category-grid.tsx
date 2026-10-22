import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CategoryResponse } from '@lorka/types';
import { Reveal } from '@/components/reveal';
import { SectionHeading } from '@/components/section-heading';
import { optimizedImage, optimizedSrcSet } from '@/lib/image';
import { cn } from '@/lib/utils';

/** Column count follows the number of categories so a short list never leaves an empty slot. */
function gridColumns(count: number) {
  if (count <= 2) return 'grid-cols-2 max-w-3xl';
  if (count === 3) return 'grid-cols-2 sm:grid-cols-3 max-w-6xl';
  return 'grid-cols-2 lg:grid-cols-4';
}

export function CategoryGrid({ categories }: { categories: CategoryResponse[] }) {
  if (categories.length === 0) return null;

  return (
    <section id="categories" className="scroll-mt-24 pb-4 pt-20 sm:pt-28">
      <div className="container">
        <Reveal>
          <SectionHeading
            eyebrow="The Collections"
            title="Shop by Category"
            subtitle="Each piece is made to carry meaning — find the one that speaks to you."
          />
        </Reveal>

        <div className={cn('mx-auto mt-14 grid gap-x-5 gap-y-12 sm:gap-x-8', gridColumns(categories.length))}>
          {categories.map((category, index) => (
            <Reveal
              key={category.id}
              delay={index * 90}
              // A lone last tile in the 2-column phone layout is centred instead of left-hanging.
              className={cn(
                categories.length === 3 && index === 2 && 'col-span-2 mx-auto w-1/2 sm:col-span-1 sm:w-auto',
              )}
            >
              <Link href={`/categories/${category.slug}`} className="group block text-center">
                <div className="relative">
                  <div aria-hidden className="arch absolute -inset-2 border border-gold/0 transition-colors duration-500 group-hover:border-gold/40" />
                  <div className="arch relative aspect-[3/4] overflow-hidden bg-muted">
                    {category.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={optimizedImage(category.image, 800)}
                        srcSet={optimizedSrcSet(category.image, [400, 600, 800])}
                        sizes="(min-width: 640px) 33vw, 50vw"
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-b from-secondary to-muted">
                        <span className="font-serif text-5xl text-gold/40">{category.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="mt-6 text-2xl font-normal text-foreground sm:text-[28px]">{category.name}</h3>
                <span className="mt-2 inline-flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.25em] text-muted-foreground transition-colors group-hover:text-gold">
                  Explore
                  <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

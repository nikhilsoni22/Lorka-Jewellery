import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CategoryResponse } from '@lorka/types';
import { Reveal } from '@/components/reveal';
import { SectionHeading } from '@/components/section-heading';

const FALLBACK_TYPES = [
  {
    name: 'Necklaces',
    icon: (
      <>
        <path d="M4 4c0 6 3 10 8 10s8-4 8-10" strokeLinecap="round" />
        <circle cx="12" cy="17" r="2.4" />
      </>
    ),
  },
  {
    name: 'Earrings',
    icon: (
      <>
        <path d="M12 3v4" strokeLinecap="round" />
        <circle cx="12" cy="9" r="2.2" />
        <path d="M12 11.5c3 1 4 3.5 2.5 6-1 1.7-3.5 1.7-4.5 0-1-1.7 0-3.5 2-3.7" />
      </>
    ),
  },
  {
    name: 'Rings',
    icon: (
      <>
        <circle cx="12" cy="15" r="6" />
        <path d="M9 9l3-6 3 6" strokeLinejoin="round" />
      </>
    ),
  },
  {
    name: 'Bracelets',
    icon: <path d="M4 12c0-4.5 3.5-8 8-8s8 3.5 8 8-3.5 8-8 8-8-3.5-8-8Z" strokeDasharray="3 3" />,
  },
];

function CardShell({
  href,
  label,
  children,
  delay,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <Link href={href} className="group block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-t-md bg-muted">{children}</div>
        <div className="flex items-center justify-between border border-t-0 border-border bg-card px-4 py-3.5 transition-colors group-hover:border-gold/40">
          <span className="font-serif text-sm uppercase tracking-wide text-foreground sm:text-base">{label}</span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-gold">
            Explore
            <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </Reveal>
  );
}

export function CategoryGrid({ categories }: { categories: CategoryResponse[] }) {
  if (categories.length === 0) {
    return (
      <section id="categories" className="container py-20">
        <Reveal>
          <SectionHeading eyebrow="Our Collection" title="Find Your Perfect Piece" />
        </Reveal>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {FALLBACK_TYPES.map((type, index) => (
            <CardShell key={type.name} href="/#featured" label={type.name} delay={index * 70}>
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted transition-transform duration-500 group-hover:scale-105">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="h-14 w-14 text-gold/60"
                >
                  {type.icon}
                </svg>
              </div>
            </CardShell>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="categories" className="container py-20">
      <Reveal>
        <SectionHeading eyebrow="Our Collection" title="Find Your Perfect Piece" />
      </Reveal>
      <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {categories.map((category, index) => (
          <CardShell
            key={category.id}
            href={`/categories/${category.slug}`}
            label={category.name}
            delay={index * 70}
          >
            {category.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={category.image}
                alt=""
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted" />
            )}
          </CardShell>
        ))}
      </div>
    </section>
  );
}

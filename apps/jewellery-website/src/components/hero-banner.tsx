import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { BannerResponse } from '@lorka/types';
import { HeroCursorTriangles } from '@/components/hero-cursor-triangles';

function HeroDots() {
  return (
    <div className="mt-10 flex items-center gap-2">
      <span className="h-1.5 w-5 rounded-full bg-foreground" />
      <span className="h-1.5 w-1.5 rounded-full bg-border" />
      <span className="h-1.5 w-1.5 rounded-full bg-border" />
    </div>
  );
}

export function HeroBanner({
  banner,
  transparent = false,
}: {
  banner: BannerResponse | undefined;
  /** True when a festival video plays behind the hero, so the section must not paint over it. */
  transparent?: boolean;
}) {
  const title = banner?.title ?? 'Shine Brighter Every Day';
  const subtitle =
    banner?.subtitle ?? 'Discover handcrafted jewellery that celebrates your unique style and every special moment.';
  const href = banner?.href || '/#categories';

  return (
    <section
      className={
        transparent
          ? 'festival-hero relative overflow-hidden pb-28 sm:pb-44 lg:pb-56'
          : 'relative overflow-hidden bg-background'
      }
    >
      <HeroCursorTriangles />
      <div
        className={`container relative z-10 w-full py-20 sm:py-28 lg:py-36 ${
          transparent ? 'flex min-h-[calc(100svh-5rem)] items-center' : ''
        }`}
      >
        <div className="text-center lg:max-w-2xl lg:text-left">
          <p className="text-xs font-medium uppercase tracking-[0.4em] text-gold">Timeless Beauty</p>
          <h1 className="mt-5 text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl">{title}</h1>
          <div className="mx-auto mt-6 flex items-center justify-center gap-3 lg:mx-0 lg:justify-start">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold/60" />
            <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
          </div>
          <p className="mx-auto mt-6 max-w-md text-muted-foreground lg:mx-0">{subtitle}</p>
          <Link
            href={href}
            className="group mt-9 inline-flex items-center gap-2.5 bg-foreground px-8 py-3.5 text-xs font-medium uppercase tracking-[0.15em] text-background transition-transform duration-300 hover:scale-[1.03]"
          >
            Shop Collection
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <div className="hidden justify-center lg:flex lg:justify-start">
            <HeroDots />
          </div>
        </div>

      </div>
    </section>
  );
}

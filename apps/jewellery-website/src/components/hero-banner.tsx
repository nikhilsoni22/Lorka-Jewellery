import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { BannerResponse } from '@lorka/types';

function HeroDots() {
  return (
    <div className="mt-10 flex items-center gap-2">
      <span className="h-1.5 w-5 rounded-full bg-foreground" />
      <span className="h-1.5 w-1.5 rounded-full bg-border" />
      <span className="h-1.5 w-1.5 rounded-full bg-border" />
    </div>
  );
}

function HeroImage({ src }: { src?: string }) {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-lg">
      <div className="absolute -right-4 -top-4 h-full w-full rounded-2xl bg-secondary sm:-right-6 sm:-top-6" />
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-muted shadow-xl">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <svg viewBox="0 0 120 120" className="h-24 w-24 text-gold/50" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="60" cy="72" r="30" />
              <path d="M45 44 60 12 75 44" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <span className="absolute -bottom-5 -left-5 hidden h-20 w-20 rotate-45 border border-gold/40 sm:block" />
    </div>
  );
}

export function HeroBanner({ banner }: { banner: BannerResponse | undefined }) {
  const title = banner?.title ?? 'Shine Brighter Every Day';
  const subtitle =
    banner?.subtitle ?? 'Discover handcrafted jewellery that celebrates your unique style and every special moment.';
  const href = banner?.href || '/#categories';

  return (
    <section className="overflow-hidden bg-background">
      <div className="container grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:py-28">
        <div className="text-center lg:text-left">
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

        <HeroImage src={banner?.image} />
      </div>
    </section>
  );
}

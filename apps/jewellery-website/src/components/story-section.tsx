import Link from 'next/link';
import { Reveal } from '@/components/reveal';

export function StorySection() {
  return (
    <section className="container py-20">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal className="relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-2xl bg-secondary lg:order-1">
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.7" className="h-20 w-20 text-gold/50">
              <circle cx="9" cy="15" r="5" />
              <path d="M14 9l6-3M14 9l6 3M14 9V4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Reveal>

        <Reveal delay={100} className="text-center lg:order-2 lg:text-left">
          <p className="text-xs font-medium uppercase tracking-[0.4em] text-gold">Our Story</p>
          <h2 className="mt-4 text-3xl leading-tight text-foreground sm:text-4xl">
            Crafted with Passion, Made for You
          </h2>
          <div className="mx-auto mt-5 flex items-center justify-center gap-3 lg:mx-0 lg:justify-start">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold/60" />
            <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
          </div>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-muted-foreground lg:mx-0">
            At Lorka Jewellers, every piece is thoughtfully designed and handcrafted by skilled artisans using
            hallmarked silver. We believe jewellery is more than an accessory — it&apos;s a reflection of you.
          </p>
          <Link
            href="/#categories"
            className="mt-8 inline-flex items-center justify-center bg-foreground px-8 py-3.5 text-xs font-medium uppercase tracking-[0.15em] text-background transition-transform duration-300 hover:scale-[1.03]"
          >
            Learn More
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

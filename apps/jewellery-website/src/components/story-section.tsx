import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/reveal';
import { optimizedImage } from '@/lib/image';

const PILLARS = [
  { title: 'Hallmarked metal', copy: 'Certified silver and gold in every piece.' },
  { title: 'Artisan made', copy: 'Each yantra is engraved and finished by hand.' },
  { title: 'Honest pricing', copy: 'Live metal rate plus a clear making charge.' },
];

/** Dark brand-story chapter. `image` is a lifestyle shot (a category photo works well). */
export function StorySection({ image }: { image?: string }) {
  return (
    <section className="relative overflow-hidden bg-espresso text-ivory">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(50% 60% at 20% 50%, hsl(var(--gold) / 0.14) 0%, transparent 70%)' }}
      />
      <div className="container relative grid items-center gap-16 py-24 sm:py-32 lg:grid-cols-2 lg:gap-24">
        <Reveal className="relative mx-auto w-full max-w-[420px]">
          <div aria-hidden className="absolute -right-4 -top-4 bottom-4 left-4 border border-gold-light/25 sm:-right-6 sm:-top-6 sm:bottom-6 sm:left-6" />
          <div className="relative aspect-[4/5] overflow-hidden bg-espresso-soft">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={optimizedImage(image, 900)} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="font-serif text-7xl text-gold-light/30">L</span>
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={120} className="text-center lg:text-left">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.35em] text-gold-light">Our Craft</p>
          <h2 className="mt-5 text-[38px] font-light leading-[1.08] text-ivory sm:text-[52px]">
            Every yantra, drawn <em className="font-normal italic text-gold-light">with intention.</em>
          </h2>
          <p className="mx-auto mt-7 max-w-lg text-[15px] font-light leading-relaxed text-ivory/70 lg:mx-0">
            At Lorka Jewellers, sacred geometry meets fine craftsmanship. Our artisans engrave each yantra by
            hand in hallmarked silver and gold — pieces made to be worn every day, and treasured for a lifetime.
          </p>

          <dl className="mt-12 grid gap-8 border-t border-ivory/10 pt-10 text-left sm:grid-cols-3 sm:gap-6">
            {PILLARS.map((pillar, index) => (
              <div key={pillar.title}>
                <dt className="flex items-baseline gap-3">
                  <span className="font-serif text-sm italic text-gold-light">0{index + 1}</span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-ivory">{pillar.title}</span>
                </dt>
                <dd className="mt-2 text-sm font-light leading-relaxed text-ivory/60">{pillar.copy}</dd>
              </div>
            ))}
          </dl>

          <Link
            href="/about"
            className="group mt-12 inline-flex h-[52px] items-center gap-3 border border-gold-light/50 px-9 text-[11.5px] font-medium uppercase tracking-[0.22em] text-ivory transition-colors duration-300 hover:border-gold-light hover:bg-gold-light hover:text-espresso"
          >
            Discover Our Story
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

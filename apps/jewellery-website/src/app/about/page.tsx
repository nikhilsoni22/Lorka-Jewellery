import type { Metadata } from 'next';
import Link from 'next/link';
import { Gem, HandHeart, ShieldCheck, Sparkles } from 'lucide-react';
import { Reveal } from '@/components/reveal';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Lorka Jewellers — minimal, premium silver jewellery, thoughtfully designed and handcrafted.',
};

const VALUES = [
  { icon: Gem, title: 'Honest pricing', copy: 'Every price is the live metal value plus a clear making charge — shown on each product.' },
  { icon: HandHeart, title: 'Handcrafted', copy: 'Each piece is made by skilled artisans, and many can be crafted to order just for you.' },
  { icon: ShieldCheck, title: 'Secure shopping', copy: 'Pay safely by UPI, or choose cash on delivery.' },
  { icon: Sparkles, title: 'Made to last', copy: 'Designs meant to be worn every day and treasured for years.' },
];

export default function AboutPage() {
  return (
    <main>
      <section className="container max-w-3xl py-16 text-center md:py-24">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.4em] text-gold">Our Story</p>
          <h1 className="mt-4 text-4xl leading-tight md:text-5xl">Crafted with Passion, Made for You</h1>
          <div className="mx-auto mt-6 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold/60" />
            <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold/60" />
          </div>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            At Lorka Jewellers, every piece is thoughtfully designed and handcrafted by skilled artisans using
            hallmarked silver. We believe jewellery is more than an accessory — it&apos;s a reflection of you.
          </p>
        </Reveal>
      </section>

      <section className="border-y border-border bg-secondary/40">
        <div className="container grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ icon: Icon, title, copy }, i) => (
            <Reveal key={title} delay={i * 80} className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-background text-gold shadow-sm">
                <Icon className="h-6 w-6" strokeWidth={1.4} />
              </span>
              <p className="mt-4 font-serif text-lg">{title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container py-16 text-center">
        <Link
          href="/#categories"
          className="inline-flex items-center justify-center bg-foreground px-8 py-3.5 text-xs font-medium uppercase tracking-[0.15em] text-background transition-transform duration-300 hover:scale-[1.03]"
        >
          Explore the collection
        </Link>
      </section>
    </main>
  );
}

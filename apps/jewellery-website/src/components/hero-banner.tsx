import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { BannerResponse, ProductResponse } from '@lorka/types';
import { optimizedImage, optimizedSrcSet } from '@/lib/image';
import { formatPrice } from '@/lib/utils';

const PROMISES = ['Hallmarked metal', 'Handcrafted', 'Free prepaid shipping'];

/**
 * Split hero on espresso: copy on the left, an arch-framed piece on the right. The arch shows the
 * admin's hero banner image when there is one, otherwise the spotlight product (whose photos are
 * shot on white, so it's contained on a white ground rather than cropped).
 */
export function HeroBanner({
  banner,
  spotlight,
}: {
  banner: BannerResponse | undefined;
  spotlight: ProductResponse | undefined;
}) {
  const href = banner?.href || '/#categories';
  const productImage = spotlight?.images[0];
  const spotlightPrice = spotlight && (spotlight.discountPrice ?? spotlight.price);

  return (
    <section className="relative isolate overflow-hidden bg-espresso text-ivory">
      {/* Warm glow behind the arch + a faint hairline grid — depth without decoration. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 70% at 78% 45%, hsl(var(--gold) / 0.22) 0%, transparent 70%), radial-gradient(40% 50% at 10% 100%, hsl(var(--gold) / 0.08) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--gold-light)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--gold-light)) 1px, transparent 1px)',
          backgroundSize: '96px 96px',
          maskImage: 'radial-gradient(ellipse at 70% 40%, black 10%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 70% 40%, black 10%, transparent 70%)',
        }}
      />

      <div className="container grid items-center gap-14 py-16 sm:py-20 lg:min-h-[calc(100svh-120px)] lg:grid-cols-12 lg:gap-10 lg:py-24">
        <div className="animate-fade-in-up text-center lg:col-span-6 lg:text-left">
          <p className="flex items-center justify-center gap-4 text-[11px] font-medium uppercase tracking-[0.35em] text-gold-light lg:justify-start">
            <span aria-hidden className="h-px w-10 bg-gold-light/60" />
            Gold · Silver · Sacred Yantra
          </p>

          <h1 className="mt-7 text-balance font-serif text-[40px] font-light leading-[1.04] tracking-[-0.015em] text-ivory sm:text-6xl lg:text-[76px]">
            {banner?.title ? (
              banner.title
            ) : (
              <>
                Sacred geometry,
                <br />
                <em className="font-normal italic text-gold-light">worn close</em> to the heart.
              </>
            )}
          </h1>

          <p className="mx-auto mt-7 max-w-md text-[15px] font-light leading-relaxed text-ivory/70 lg:mx-0">
            {banner?.subtitle ||
              'Yantra pendants, chains and Ramnami jewellery — handcrafted by artisans in hallmarked silver and gold.'}
          </p>

          <div className="mt-10 flex flex-col items-center gap-6 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href={href}
              className="group inline-flex h-[52px] items-center gap-3 bg-gold-light px-9 text-[11.5px] font-medium uppercase tracking-[0.22em] text-espresso transition-colors duration-300 hover:bg-ivory"
            >
              Shop the Collection
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>
            <Link
              href="/#new-arrivals"
              className="link-underline pb-1 text-[11.5px] font-medium uppercase tracking-[0.22em] text-ivory/85 transition-colors hover:text-ivory"
            >
              New Arrivals
            </Link>
          </div>

          <ul className="mt-14 hidden flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-ivory/10 pt-7 text-[10.5px] uppercase tracking-[0.25em] text-ivory/55 sm:flex lg:justify-start">
            {PROMISES.map((promise, index) => (
              <li key={promise} className="flex items-center gap-6">
                {index > 0 && <span aria-hidden className="h-1 w-1 rotate-45 bg-gold-light/60" />}
                {promise}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[300px] animate-scale-in sm:max-w-[380px] lg:col-span-6 lg:max-w-[440px]">
          {/* Offset hairline arch behind the image. */}
          <div aria-hidden className="arch absolute -inset-3 border border-gold-light/30 sm:-inset-4" />
          <div aria-hidden className="arch absolute -inset-7 hidden border border-gold-light/10 sm:block" />

          <div className="arch relative aspect-[4/5] overflow-hidden bg-espresso-soft shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)]">
            {banner?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={optimizedImage(banner.image, 900)}
                alt={banner.title || ''}
                fetchPriority="high"
                className="h-full w-full object-cover"
              />
            ) : productImage ? (
              <>
                {/* Blurred copy fills the arch, so it matches whether the shot is on white or on velvet. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={optimizedImage(productImage, 200)}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={optimizedImage(productImage, 800)}
                  srcSet={optimizedSrcSet(productImage, [480, 800, 1000])}
                  sizes="(min-width: 1024px) 440px, 380px"
                  alt={spotlight.name}
                  fetchPriority="high"
                  className="relative h-full w-full object-contain"
                />
              </>
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-b from-secondary to-muted">
                <span className="font-serif text-6xl tracking-[0.3em] text-gold/50">L</span>
              </div>
            )}
          </div>

          {spotlight && !banner?.image && (
            <Link
              href={`/products/${spotlight.slug}`}
              className="group absolute -bottom-6 left-1/2 w-[86%] -translate-x-1/2 bg-ivory px-5 py-4 text-espresso shadow-[0_20px_40px_-20px_rgb(0_0_0/0.5)] sm:-left-10 sm:w-auto sm:min-w-[250px] sm:translate-x-0 lg:-left-16"
            >
              <span className="block text-[10px] font-medium uppercase tracking-[0.28em] text-gold">In the spotlight</span>
              <span className="mt-1.5 flex items-end justify-between gap-6">
                <span className="font-serif text-lg capitalize leading-tight">{spotlight.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-sm font-medium">
                  {spotlightPrice !== undefined && formatPrice(spotlightPrice)}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                </span>
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import type { CategoryResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { optimizedImage } from '@/lib/image';
import { BrandLogo } from '@/components/brand-logo';
import { CartIndicator } from '@/components/cart-indicator';
import { WishlistIndicator } from '@/components/wishlist-indicator';
import { AccountMenu } from '@/components/account-menu';
import { SearchOverlay } from '@/components/search-overlay';
import { MobileNav } from '@/components/mobile-nav';

const DISCOVER_LINKS = [
  { label: 'Featured Jewellery', href: '/#featured' },
  { label: 'New Arrivals', href: '/#new-arrivals' },
  { label: 'Your Wishlist', href: '/wishlist' },
  { label: 'Track an Order', href: '/track-order' },
];

const NAV_LINKS = [
  { label: 'New Arrivals', href: '/#new-arrivals' },
  { label: 'Our Story', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

/**
 * Full-width "Shop" panel that opens on hover/focus. It is positioned against the sticky header
 * (the trigger wrapper is deliberately not `relative`), so it spans the whole page width.
 */
function ShopMegaMenu({ categories }: { categories: CategoryResponse[] }) {
  const tiles = categories.filter((c) => c.image).slice(0, 2);

  return (
    <div className="group flex h-full items-center">
      <button type="button" className="flex h-full items-center gap-1.5 uppercase transition-colors hover:text-gold">
        Shop
        <ChevronDown className="h-3 w-3 transition-transform duration-300 group-hover:rotate-180" strokeWidth={2} />
      </button>

      <div className="invisible absolute inset-x-0 top-full border-y border-border bg-background normal-case tracking-normal opacity-0 shadow-[0_24px_40px_-24px_rgb(0_0_0/0.18)] transition-all duration-300 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div className="container grid grid-cols-12 gap-10 py-10">
          <div className="col-span-3">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.3em] text-gold">Shop by Category</p>
            <ul className="mt-5 space-y-3">
              {categories.length === 0 && <li className="text-sm text-muted-foreground">New pieces coming soon.</li>}
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="font-serif text-[22px] font-normal leading-tight text-foreground transition-colors hover:text-gold"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-3">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.3em] text-gold">Discover</p>
            <ul className="mt-5 space-y-3.5">
              {DISCOVER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="link-underline text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-6 grid grid-cols-2 gap-5">
            {tiles.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group/tile relative block aspect-[4/3] overflow-hidden bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={optimizedImage(category.image, 640)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover/tile:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-espresso/75 via-espresso/10 to-transparent" />
                <span className="absolute inset-x-5 bottom-4 flex items-end justify-between text-ivory">
                  <span className="font-serif text-2xl">{category.name}</span>
                  <span className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.25em] text-ivory/85">
                    Shop
                    <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover/tile:translate-x-1" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function SiteHeader() {
  const categories = await apiGet<CategoryResponse[]>('/categories?isActive=true&limit=50').catch(
    () => [] as CategoryResponse[],
  );
  const categoryLinks = categories.map((c) => ({ name: c.name, slug: c.slug }));

  return (
    // Solid background on purpose: a backdrop-filter here would trap the fixed search overlay and
    // mobile drawer inside the header box.
    <header className="site-header sticky top-0 z-50 border-b border-border/80 bg-background">
      <div className="container grid h-[72px] grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-[84px]">
        <div className="flex h-full items-center">
          <MobileNav categories={categoryLinks} />
          <nav className="hidden h-full items-center gap-9 text-[11.5px] font-medium uppercase tracking-[0.22em] text-foreground lg:flex">
            <ShopMegaMenu categories={categories} />
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="link-underline py-1 transition-colors hover:text-gold">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <BrandLogo priority />

        <div className="flex items-center justify-end gap-5 sm:gap-6">
          <SearchOverlay categories={categoryLinks} />
          <AccountMenu />
          <WishlistIndicator />
          <CartIndicator />
        </div>
      </div>
    </header>
  );
}

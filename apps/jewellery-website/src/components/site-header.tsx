import Link from 'next/link';
import Image from 'next/image';
import { Search, ChevronDown } from 'lucide-react';
import type { CategoryResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { CartIndicator } from '@/components/cart-indicator';
import { AccountMenu } from '@/components/account-menu';

const COLLECTION_LINKS = [
  { label: 'Featured Jewellery', href: '/#featured' },
  { label: 'New Arrivals', href: '/#new-arrivals' },
];

const PAGE_LINKS = [
  { label: 'My Account', href: '/account/login' },
  { label: 'My Orders', href: '/account/orders' },
  { label: 'Cart', href: '/cart' },
  { label: 'Checkout', href: '/checkout' },
];

function NavDropdown({
  label,
  items,
  emptyLabel,
}: {
  label: string;
  items: { label: string; href: string }[];
  emptyLabel?: string;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-1 py-2 transition-colors hover:text-gold"
      >
        {label}
        <ChevronDown className="h-3 w-3" strokeWidth={2} />
      </button>
      <div className="invisible absolute left-1/2 top-full z-50 min-w-[180px] -translate-x-1/2 translate-y-1 rounded-sm border border-border bg-card py-2 opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {items.length === 0 && emptyLabel ? (
          <span className="block whitespace-nowrap px-4 py-1.5 text-xs normal-case tracking-normal text-muted-foreground">
            {emptyLabel}
          </span>
        ) : (
          items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="block whitespace-nowrap px-4 py-1.5 text-left text-xs uppercase tracking-wide text-foreground transition-colors hover:bg-secondary hover:text-gold"
            >
              {item.label}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export async function SiteHeader() {
  const categories = await apiGet<CategoryResponse[]>('/categories?isActive=true&limit=50').catch(
    () => [] as CategoryResponse[],
  );
  const shopLinks = categories.map((category) => ({
    label: category.name,
    href: `/categories/${category.slug}`,
  }));

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container flex h-20 items-center justify-between gap-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-gold/50">
            <Image
              src="/images/lorka_jewellers_logo.jpeg"
              alt="Lorka Jewellers"
              fill
              sizes="36px"
              className="object-cover"
              priority
            />
          </span>
          <span className="font-serif text-xl tracking-[0.25em] text-foreground">LORKA</span>
        </Link>

        <nav className="hidden items-center gap-7 text-xs font-medium uppercase tracking-[0.12em] text-foreground lg:flex">
          <Link href="/" className="border-b border-gold py-2 text-gold">
            Home
          </Link>
          <NavDropdown label="Shop" items={shopLinks} emptyLabel="No categories yet" />
          <NavDropdown label="Collection" items={COLLECTION_LINKS} />
          <NavDropdown label="Pages" items={PAGE_LINKS} />
          <span className="cursor-default py-2 text-muted-foreground/70">Blog</span>
          <span className="cursor-default py-2 text-muted-foreground/70">Contact</span>
        </nav>

        <div className="flex shrink-0 items-center gap-5">
          <button
            type="button"
            aria-label="Search"
            className="hidden text-foreground transition-colors hover:text-gold sm:inline-flex"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
          <AccountMenu />
          <CartIndicator />
        </div>
      </div>
    </header>
  );
}

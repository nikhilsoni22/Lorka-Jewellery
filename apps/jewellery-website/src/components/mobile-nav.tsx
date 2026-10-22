'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Heart, Menu, Package, User, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/brand-logo';

const MORE_LINKS = [
  { label: 'Featured Jewellery', href: '/#featured' },
  { label: 'New Arrivals', href: '/#new-arrivals' },
  { label: 'Our Story', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

/** Hamburger + slide-in drawer for screens below `lg`, where the desktop nav is hidden. */
export function MobileNav({ categories }: { categories: { name: string; slug: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const utilityLinks = [
    { label: user ? 'My Orders' : 'Sign In', href: user ? '/account/orders' : '/account/login', icon: User },
    { label: 'Wishlist', href: '/wishlist', icon: Heart },
    { label: 'Track Order', href: '/track-order', icon: Package },
  ];

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="-ml-1 p-1 text-foreground transition-colors hover:text-gold lg:hidden"
      >
        <Menu className="h-[22px] w-[22px]" strokeWidth={1.4} />
      </button>

      <div className={cn('fixed inset-0 z-[90] lg:hidden', open ? 'visible' : 'invisible delay-500')}>
        <div
          onClick={() => setOpen(false)}
          className={cn(
            'absolute inset-0 bg-espresso/50 backdrop-blur-sm transition-opacity duration-500',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          // Hash links (/#featured) don't change the pathname, so close on any link tap too.
          onClick={(e) => (e.target as HTMLElement).closest('a') && setOpen(false)}
          className={cn(
            'absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-background shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-[72px] items-center justify-between border-b border-border px-5">
            <BrandLogo />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-5 w-5" strokeWidth={1.4} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-8">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.3em] text-gold">Shop by Category</p>
            <ul className="mt-4 divide-y divide-border/70 border-y border-border/70">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="flex items-center justify-between py-3.5 font-serif text-[22px] text-foreground"
                  >
                    {category.name}
                    <ArrowRight className="h-4 w-4 text-gold" strokeWidth={1.4} />
                  </Link>
                </li>
              ))}
            </ul>

            <ul className="mt-8 space-y-4">
              {MORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] uppercase tracking-[0.2em] text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <ul className="mt-10 space-y-3.5 border-t border-border pt-8">
              {utilityLinks.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <Link href={href} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Icon className="h-4 w-4" strokeWidth={1.4} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <p className="bg-espresso px-5 py-3.5 text-center text-[10.5px] uppercase tracking-[0.22em] text-ivory/80">
            Free shipping on all prepaid orders
          </p>
        </aside>
      </div>
    </>
  );
}

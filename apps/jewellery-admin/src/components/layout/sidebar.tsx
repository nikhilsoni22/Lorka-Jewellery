'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Gem,
  ShoppingBag,
  Users,
  Tags,
  ImageIcon,
  Settings,
  Ticket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Brand } from '@/components/brand';

// Phase 2 ships Products/Categories/Banners; later phases enable the rest.
const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, enabled: true },
  { label: 'Products', href: '/products', icon: Gem, enabled: true },
  { label: 'Categories', href: '/categories', icon: Tags, enabled: true },
  { label: 'Orders', href: '/orders', icon: ShoppingBag, enabled: true },
  { label: 'Customers', href: '/customers', icon: Users, enabled: true },
  { label: 'Banners', href: '/banners', icon: ImageIcon, enabled: true },
  { label: 'Tickets', href: '/tickets', icon: Ticket, enabled: true },
  { label: 'Settings', href: '/settings', icon: Settings, enabled: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const classes = cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            active
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            !item.enabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
          );

          if (!item.enabled) {
            return (
              <span key={item.label} className={classes} title="Coming in a later phase">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
            );
          }
          return (
            <Link key={item.label} href={item.href} className={classes}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        Phase 2 · Product Catalog
      </div>
    </aside>
  );
}

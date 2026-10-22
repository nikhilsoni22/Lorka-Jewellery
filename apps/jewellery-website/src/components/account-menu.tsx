'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';

export function AccountMenu() {
  const { user, status, clearSession } = useAuth();
  const router = useRouter();

  if (status === 'loading') {
    return <span className="hidden h-5 w-5 sm:inline-block" />;
  }

  if (!user) {
    return (
      <Link
        href="/account/login"
        aria-label="Account"
        className="hidden text-foreground transition-colors hover:text-gold sm:inline-flex"
      >
        <User className="h-5 w-5" strokeWidth={1.3} />
      </Link>
    );
  }

  const handleLogout = async () => {
    await apiClient.post('/auth/logout').catch(() => undefined);
    clearSession();
    router.push('/');
  };

  return (
    <div className="group relative hidden sm:block">
      <button type="button" aria-label="Account" className="flex text-foreground transition-colors hover:text-gold">
        <User className="h-5 w-5" strokeWidth={1.3} />
      </button>
      <div className="invisible absolute right-0 top-full z-50 min-w-[180px] translate-y-1 border border-border bg-background py-2 opacity-0 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.25)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <Link
          href="/account/orders"
          className="block whitespace-nowrap px-5 py-2 text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-secondary hover:text-gold"
        >
          My Orders
        </Link>
        <Link
          href="/account/tickets"
          className="block whitespace-nowrap px-5 py-2 text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-secondary hover:text-gold"
        >
          My Tickets
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="block w-full whitespace-nowrap px-5 py-2 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-secondary hover:text-gold"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

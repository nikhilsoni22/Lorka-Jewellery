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
    return <span className="hidden h-[18px] w-[18px] sm:inline-block" />;
  }

  if (!user) {
    return (
      <Link
        href="/account/login"
        aria-label="Account"
        className="hidden text-foreground transition-colors hover:text-gold sm:inline-flex"
      >
        <User className="h-[18px] w-[18px]" strokeWidth={1.5} />
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
      <button type="button" aria-label="Account" className="text-foreground transition-colors hover:text-gold">
        <User className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>
      <div className="invisible absolute right-0 top-full z-50 min-w-[160px] translate-y-1 rounded-sm border border-border bg-card py-2 opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <Link
          href="/account/orders"
          className="block whitespace-nowrap px-4 py-1.5 text-xs uppercase tracking-wide text-foreground transition-colors hover:bg-secondary hover:text-gold"
        >
          My Orders
        </Link>
        <Link
          href="/account/tickets"
          className="block whitespace-nowrap px-4 py-1.5 text-xs uppercase tracking-wide text-foreground transition-colors hover:bg-secondary hover:text-gold"
        >
          My Tickets
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="block w-full whitespace-nowrap px-4 py-1.5 text-left text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-gold"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

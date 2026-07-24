'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useLogout } from '@/lib/hooks';

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const logout = useLogout();

  const onLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        toast.success('Signed out');
        router.replace('/login');
      },
    });
  };

  const roleLabel = user?.role.replace('_', ' ');

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-card/60 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="-ml-1 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="truncate text-sm font-medium">
            {user?.name} <span className="text-muted-foreground">· {roleLabel}</span>
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onLogout} disabled={logout.isPending}>
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </header>
  );
}

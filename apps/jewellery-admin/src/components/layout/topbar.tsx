'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useLogout } from '@/lib/hooks';

export function Topbar() {
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
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/60 px-6 backdrop-blur">
      <div>
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="text-sm font-medium">
          {user?.name} <span className="text-muted-foreground">· {roleLabel}</span>
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onLogout} disabled={logout.isPending}>
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </header>
  );
}

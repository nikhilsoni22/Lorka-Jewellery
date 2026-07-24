'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { LoginResult } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { setSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account/orders';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await apiClient.post<LoginResult>('/auth/login', { email, password, rememberMe });
      setSession(result);
      if (!result.user.emailVerified) {
        // Their original OTP (from registration) has likely expired by now — send a fresh one
        // so the verify screen isn't a dead end.
        apiClient.post('/auth/verify-email/resend').catch(() => {});
        router.push(`/account/verify-email?redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      router.push(redirect);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container max-w-md py-16">
      <h1 className="text-3xl">Sign In</h1>
      <p className="mt-2 text-muted-foreground">Access your orders and account.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(inputClass, 'mt-1')}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(inputClass, 'mt-1')}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Keep me signed in
        </label>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/account/register" className="text-foreground underline hover:text-gold">
          Create one
        </Link>
      </p>
    </main>
  );
}

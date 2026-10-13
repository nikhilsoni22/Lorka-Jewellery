'use client';

import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { LoginResult } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { AuthDivider, GoogleSignIn } from '@/components/google-sign-in';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { isGoogleLoginEnabled } from '@/lib/firebase';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { status, setSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account/orders';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nameStep, setNameStep] = useState(false);
  // Set once this page signs someone in, so the "already signed in" redirect below doesn't
  // race the page's own post-login navigation (e.g. to email verification).
  const signedInHere = useRef(false);

  // Already signed in (e.g. they reopened the site) — there's nothing to do on this page.
  useEffect(() => {
    if (status === 'authenticated' && !signedInHere.current) router.replace(redirect);
  }, [status, redirect, router]);

  const handleGoogleSignedIn = useCallback(
    (result: LoginResult, isNewUser: boolean) => {
      signedInHere.current = true;
      setSession(result);
      toast.success(isNewUser ? `Welcome to Lorka, ${result.user.name}!` : `Welcome back, ${result.user.name}!`);
      router.push(redirect);
    },
    [redirect, router, setSession],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await apiClient.post<LoginResult>('/auth/login', { email, password, rememberMe });
      signedInHere.current = true;
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
    <main className="container max-w-md py-12 sm:py-16">
      {!nameStep && (
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Welcome back</p>
          <h1 className="mt-2 text-3xl">Sign In</h1>
          <p className="mt-2 text-muted-foreground">Access your orders and account.</p>
        </div>
      )}

      <div className={cn('rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8', !nameStep && 'mt-8')}>
        <GoogleSignIn onSignedIn={handleGoogleSignedIn} onNameStepChange={setNameStep} />

        {!nameStep && (
          <>
            {isGoogleLoginEnabled && <AuthDivider label="or sign in with email" />}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(inputClass, 'mt-1')}
                />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
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

              <Button type="submit" disabled={submitting} className="w-full py-3">
                {submitting ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          </>
        )}
      </div>

      {!nameStep && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/account/register" className="text-foreground underline hover:text-gold">
            Create one
          </Link>
        </p>
      )}
    </main>
  );
}

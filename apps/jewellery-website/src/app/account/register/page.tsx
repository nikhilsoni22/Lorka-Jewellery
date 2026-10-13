'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

export default function RegisterPage() {
  const { status, setSession } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nameStep, setNameStep] = useState(false);
  const signedInHere = useRef(false);

  // Already signed in — no account to create.
  useEffect(() => {
    if (status === 'authenticated' && !signedInHere.current) router.replace('/account/orders');
  }, [status, router]);

  const handleGoogleSignedIn = useCallback(
    (result: LoginResult, isNewUser: boolean) => {
      signedInHere.current = true;
      setSession(result);
      toast.success(isNewUser ? `Welcome to Lorka, ${result.user.name}!` : `Welcome back, ${result.user.name}!`);
      router.push(isNewUser ? '/' : '/account/orders');
    },
    [router, setSession],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await apiClient.post<LoginResult>('/auth/register', { name, email, password });
      signedInHere.current = true;
      setSession(result);
      router.push('/account/verify-email');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container max-w-md py-12 sm:py-16">
      {!nameStep && (
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Join Lorka</p>
          <h1 className="mt-2 text-3xl">Create Account</h1>
          <p className="mt-2 text-muted-foreground">Sign up to track your orders.</p>
        </div>
      )}

      <div className={cn('rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8', !nameStep && 'mt-8')}>
        <GoogleSignIn onSignedIn={handleGoogleSignedIn} onNameStepChange={setNameStep} />

        {!nameStep && (
          <>
            {isGoogleLoginEnabled && <AuthDivider label="or sign up with email" />}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="text-sm font-medium">
                  Full name
                </label>
                <input
                  id="name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(inputClass, 'mt-1')}
                />
              </div>
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
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(inputClass, 'mt-1')}
                />
                <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
              </div>

              <Button type="submit" disabled={submitting} className="w-full py-3">
                {submitting ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>
          </>
        )}
      </div>

      {!nameStep && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/account/login" className="text-foreground underline hover:text-gold">
            Sign in
          </Link>
        </p>
      )}
    </main>
  );
}

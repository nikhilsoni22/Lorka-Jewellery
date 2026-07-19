'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-[0.5em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function VerifyEmailPage() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();

  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/account/login?redirect=/account/verify-email');
    } else if (user?.emailVerified) {
      router.replace('/account/orders');
    }
  }, [authStatus, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/auth/verify-email/otp', { otp });
      toast.success('Email verified!');
      router.push('/account/orders');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid or expired code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await apiClient.post('/auth/verify-email/resend');
      toast.success('A new code has been sent to your email');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to resend code');
    } finally {
      setResending(false);
    }
  };

  if (authStatus !== 'authenticated' || !user || user.emailVerified) {
    return (
      <main className="container py-20">
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-md py-16">
      <h1 className="text-3xl">Verify Your Email</h1>
      <p className="mt-2 text-muted-foreground">
        We&apos;ve sent a 6-digit code to <span className="text-foreground">{user.email}</span>. Enter it
        below to confirm your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          required
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className={cn(inputClass)}
        />
        <Button type="submit" disabled={submitting || otp.length !== 6} className="w-full">
          {submitting ? 'Verifying…' : 'Verify Email'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Didn&apos;t get the code?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-foreground underline hover:text-gold disabled:opacity-50"
        >
          {resending ? 'Sending…' : 'Resend code'}
        </button>
      </p>
    </main>
  );
}

'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { GoogleLoginResponse, LoginResult } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import {
  googleErrorMessage,
  isGoogleLoginEnabled,
  loadGoogleSignIn,
  type GoogleAccount,
  type GoogleSignIn as GoogleSignInFn,
} from '@/lib/firebase';
import { cn } from '@/lib/utils';

interface GoogleSignInProps {
  /** Called once our API session exists — `isNewUser` is true for a just-created account. */
  onSignedIn: (result: LoginResult, isNewUser: boolean) => void;
  /** True while the "what should we call you?" step is showing, so the page can hide its form. */
  onNameStepChange?: (active: boolean) => void;
}

/**
 * "Continue with Google": Google's account picker → our API. A returning customer is signed in
 * straight away; a new one is asked for their name first, then their account is created.
 */
export function GoogleSignIn({ onSignedIn, onNameStepChange }: GoogleSignInProps) {
  const signInRef = useRef<GoogleSignInFn | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<GoogleAccount | null>(null);
  const [name, setName] = useState('');

  // Load Firebase as soon as the page opens, so the click can open the popup immediately.
  useEffect(() => {
    if (!isGoogleLoginEnabled) return;
    loadGoogleSignIn()
      .then((fn) => {
        signInRef.current = fn;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    onNameStepChange?.(pending !== null);
  }, [pending, onNameStepChange]);

  if (!isGoogleLoginEnabled) return null;

  const exchange = async (account: GoogleAccount, chosenName?: string) => {
    const res = await apiClient.post<GoogleLoginResponse>('/auth/google', {
      idToken: account.idToken,
      ...(chosenName ? { name: chosenName } : {}),
    });
    if (res.status === 'needs_name') {
      setName(res.suggestedName || account.displayName);
      setPending(account);
      return;
    }
    const { status: _status, isNewUser, ...result } = res;
    onSignedIn(result, isNewUser);
  };

  const handleClick = async () => {
    setBusy(true);
    try {
      const signIn = signInRef.current ?? (await loadGoogleSignIn());
      await exchange(await signIn());
    } catch (err) {
      const message = googleErrorMessage(err);
      if (message) toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleNameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    setBusy(true);
    try {
      await exchange(pending, name.trim());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to create your account');
    } finally {
      setBusy(false);
    }
  };

  if (pending) {
    return (
      <form onSubmit={handleNameSubmit} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col items-center text-center">
          <Avatar account={pending} />
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-gold">Almost there</p>
          <h2 className="mt-1 text-2xl">What should we call you?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Signing in as <span className="text-foreground">{pending.email}</span>
          </p>
        </div>

        <div className="mt-6">
          <label htmlFor="google-name" className="text-sm font-medium">
            Full name
          </label>
          <input
            id="google-name"
            required
            autoFocus
            minLength={2}
            maxLength={80}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <Button type="submit" disabled={busy || name.trim().length < 2} className="mt-5 w-full py-3">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? 'Creating your account…' : 'Continue'}
        </Button>
        <button
          type="button"
          onClick={() => setPending(null)}
          disabled={busy}
          className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-gold hover:underline disabled:opacity-50"
        >
          Use a different Google account
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={cn(
        'group relative flex h-12 w-full items-center justify-center gap-3 rounded-md border border-[#dadce0] bg-white px-4',
        'text-[15px] font-medium tracking-[0.01em] text-[#1f1f1f] shadow-[0_1px_2px_rgba(60,64,67,0.08)]',
        'transition-all duration-200 hover:border-[#c6c9ce] hover:bg-[#f8f9fa] hover:shadow-[0_1px_3px_rgba(60,64,67,0.2),0_4px_8px_rgba(60,64,67,0.08)]',
        'active:bg-[#f1f3f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285f4] focus-visible:ring-offset-2',
        'disabled:cursor-wait disabled:opacity-80',
      )}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin text-[#5f6368]" />
      ) : (
        <GoogleLogo className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
      )}
      <span>{busy ? 'Connecting to Google…' : 'Continue with Google'}</span>
    </button>
  );
}

function Avatar({ account }: { account: GoogleAccount }) {
  const [broken, setBroken] = useState(false);
  const initial = (account.displayName || account.email).charAt(0).toUpperCase();
  return (
    <div className="rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-light p-[2px] shadow-sm">
      {account.photoURL && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={account.photoURL}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="h-16 w-16 rounded-full border-2 border-background object-cover"
        />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-background bg-secondary font-serif text-2xl">
          {initial}
        </span>
      )}
    </div>
  );
}

/** Google's multicolour "G" mark, per Google's sign-in branding guidelines. */
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/** "or" separator between the Google button and the email form. */
export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-4" role="separator">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

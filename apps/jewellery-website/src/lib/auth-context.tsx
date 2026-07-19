'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LoginResult, PublicUser } from '@lorka/types';
import { bootstrapSession, setAccessToken } from './api-client';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: PublicUser | null;
  status: AuthStatus;
  setSession: (result: LoginResult) => void;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;
    bootstrapSession().then((result) => {
      if (!active) return;
      if (result) {
        setUser(result.user);
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setSession = (result: LoginResult) => {
    setAccessToken(result.accessToken);
    setUser(result.user);
    setStatus('authenticated');
  };

  const clearSession = () => {
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
  };

  return (
    <AuthContext.Provider value={{ user, status, setSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

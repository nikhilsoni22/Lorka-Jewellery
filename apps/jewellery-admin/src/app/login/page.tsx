'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/components/brand';
import { LoginForm } from '@/components/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,hsl(var(--silver-muted)),transparent_60%)]" />
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>Admin Sign In</CardTitle>
            <CardDescription>Access the Lorka Jewellers control panel</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Lorka Jewellers · Secured area
        </p>
      </div>
    </main>
  );
}

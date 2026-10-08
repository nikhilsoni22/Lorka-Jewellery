import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { NavigationProgress } from '@/components/navigation-progress';

export const metadata: Metadata = {
  title: 'Lorka Jewellers — Admin',
  description: 'Administration panel for Lorka Jewellers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NavigationProgress />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { CartProvider } from '@/lib/cart-context';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Lorka Jewellers — Fine Silver Jewellery',
  description:
    'Lorka Jewellers — minimal, premium, hallmarked silver jewellery. Rings, chains, pendants and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            <SiteHeader />
            {children}
          </CartProvider>
        </AuthProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

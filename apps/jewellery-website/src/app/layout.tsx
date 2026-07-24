import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { CartProvider } from '@/lib/cart-context';
import { AuthProvider } from '@/lib/auth-context';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const TITLE = 'Lorka Jewellers — Fine Silver Jewellery';
const DESCRIPTION =
  'Lorka Jewellers — minimal, premium, hallmarked silver jewellery. Rings, chains, pendants and more.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s | Lorka Jewellers' },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'Lorka Jewellers',
    images: ['/images/lorka_jewellers_logo.jpeg'],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/images/lorka_jewellers_logo.jpeg'],
  },
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

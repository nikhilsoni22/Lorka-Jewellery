import type { Metadata } from 'next';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { AnnouncementBar } from '@/components/announcement-bar';
import { CartProvider } from '@/lib/cart-context';
import { AuthProvider } from '@/lib/auth-context';
import { NavigationProgress } from '@/components/navigation-progress';
import { WishlistProvider } from '@/lib/wishlist-context';
import { SiteFooter } from '@/components/site-footer';
import { WhatsAppFloat } from '@/components/whatsapp-float';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});
const sans = Jost({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const TITLE = 'Lorka Jewellers — Sacred Yantra Jewellery in Silver & Gold';
const DESCRIPTION =
  'Lorka Jewellers — handcrafted yantra pendants, chains and Ramnami jewellery in hallmarked silver and gold.';

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
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body suppressHydrationWarning>
        <NavigationProgress />
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <AnnouncementBar />
              <SiteHeader />
              {children}
              <SiteFooter />
              <WhatsAppFloat />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

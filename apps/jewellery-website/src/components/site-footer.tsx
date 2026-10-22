import Link from 'next/link';
import { Facebook, Instagram, Mail, MapPin, Phone, ShieldCheck, Youtube } from 'lucide-react';
import type { CategoryResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { getSettings, whatsappLink } from '@/lib/store';
import { POLICY_PAGES } from '@/lib/policies';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { BrandLogo } from '@/components/brand-logo';

const HELP_LINKS = [
  { label: 'Track Order', href: '/track-order' },
  { label: 'My Orders', href: '/account/orders' },
  { label: 'Wishlist', href: '/wishlist' },
  { label: 'Support Tickets', href: '/account/tickets' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'About Us', href: '/about' },
];

export async function SiteFooter() {
  const [settings, categories] = await Promise.all([
    getSettings(),
    apiGet<CategoryResponse[]>('/categories?isActive=true&limit=8').catch(() => [] as CategoryResponse[]),
  ]);
  const info = settings.storeInfo;
  const socials = [
    { href: info.instagramUrl, label: 'Instagram', icon: Instagram },
    { href: info.facebookUrl, label: 'Facebook', icon: Facebook },
    { href: info.youtubeUrl, label: 'YouTube', icon: Youtube },
  ].filter((s) => s.href);
  const whatsapp = whatsappLink(info.whatsappNumber, 'Hi Lorka Jewellers!');
  // Only name the payment options the store actually has switched on.
  const { onlineEnabled, upiEnabled, codEnabled } = settings.paymentMethods;
  const paymentOptions = [
    onlineEnabled && 'Cards · Netbanking',
    (onlineEnabled || upiEnabled) && 'UPI',
    codEnabled && 'Cash on Delivery',
  ].filter(Boolean);

  return (
    <footer className="mt-20 bg-espresso text-ivory/65">
      <div className="container grid gap-12 py-16 sm:grid-cols-2 sm:py-20 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <BrandLogo tone="light" />
          <p className="mt-6 max-w-xs text-sm font-light leading-relaxed">
            Sacred yantras, chains and Ramnami jewellery — handcrafted in hallmarked silver and gold, to be worn
            every day and treasured for years.
          </p>
          {socials.length > 0 && (
            <div className="mt-7 flex gap-3">
              {socials.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory/15 text-ivory/80 transition-colors hover:border-gold-light hover:text-gold-light"
                >
                  <Icon className="h-4 w-4" strokeWidth={1.4} />
                </a>
              ))}
            </div>
          )}
        </div>

        <FooterColumn title="Shop" className="lg:col-span-2 lg:col-start-6">
          {categories.length === 0 && <FooterLink href="/search">Browse all</FooterLink>}
          {categories.map((c) => (
            <FooterLink key={c.id} href={`/categories/${c.slug}`}>
              {c.name}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Help" className="lg:col-span-2">
          {HELP_LINKS.map((l) => (
            <FooterLink key={l.href} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Get in touch" className="lg:col-span-3">
          {info.phone && (
            <a href={`tel:${info.phone}`} className="flex items-start gap-3 text-sm font-light transition-colors hover:text-gold-light">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" strokeWidth={1.4} /> {info.phone}
            </a>
          )}
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-sm font-light transition-colors hover:text-gold-light">
              <WhatsAppIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" /> Chat on WhatsApp
            </a>
          )}
          {info.email && (
            <a href={`mailto:${info.email}`} className="flex items-start gap-3 break-all text-sm font-light transition-colors hover:text-gold-light">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" strokeWidth={1.4} /> {info.email}
            </a>
          )}
          {info.address && (
            <p className="flex items-start gap-3 whitespace-pre-line text-sm font-light">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" strokeWidth={1.4} /> {info.address}
            </p>
          )}
          {!info.phone && !info.email && !whatsapp && (
            <FooterLink href="/contact">Contact us</FooterLink>
          )}
        </FooterColumn>
      </div>

      <div className="border-t border-ivory/10">
        <div className="container flex flex-col gap-4 py-7 text-[11.5px] font-light lg:flex-row lg:items-center lg:justify-between">
          <p>
            © {new Date().getFullYear()} Lorka Jewellers. All rights reserved.
            {info.gstin && <span className="ml-2 text-ivory/45">GSTIN: {info.gstin}</span>}
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {POLICY_PAGES.map((p) => (
              <Link key={p.slug} href={`/policies/${p.slug}`} className="transition-colors hover:text-gold-light">
                {p.title}
              </Link>
            ))}
          </nav>
          {paymentOptions.length > 0 && (
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gold-light" strokeWidth={1.4} />
              Secure payments · {paymentOptions.join(' · ')}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <p className="text-[10.5px] font-medium uppercase tracking-[0.3em] text-gold-light">{title}</p>
      <div className="mt-6 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm font-light transition-colors hover:text-gold-light">
      {children}
    </Link>
  );
}

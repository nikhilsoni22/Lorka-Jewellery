import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Mail, MapPin, Phone, ShieldCheck, Youtube } from 'lucide-react';
import type { CategoryResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { getSettings, whatsappLink } from '@/lib/store';
import { POLICY_PAGES } from '@/lib/policies';
import { WhatsAppIcon } from '@/components/whatsapp-icon';

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

  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative h-10 w-10 overflow-hidden rounded-full ring-1 ring-gold/50">
              <Image src="/images/lorka_jewellers_logo.jpeg" alt="Lorka Jewellers" fill sizes="40px" className="object-cover" />
            </span>
            <span className="font-serif text-xl tracking-[0.25em]">LORKA</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Minimal, premium silver jewellery — crafted to be worn every day and treasured for years.
          </p>
          {socials.length > 0 && (
            <div className="mt-5 flex gap-3">
              {socials.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background transition-colors hover:border-gold hover:text-gold"
                >
                  <Icon className="h-4 w-4" strokeWidth={1.6} />
                </a>
              ))}
            </div>
          )}
        </div>

        <FooterColumn title="Shop">
          {categories.length === 0 && <FooterLink href="/search">Browse all</FooterLink>}
          {categories.map((c) => (
            <FooterLink key={c.id} href={`/categories/${c.slug}`}>
              {c.name}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Help">
          {HELP_LINKS.map((l) => (
            <FooterLink key={l.href} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Get in touch">
          {info.phone && (
            <a href={`tel:${info.phone}`} className="flex items-start gap-2 text-sm text-muted-foreground hover:text-gold">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.6} /> {info.phone}
            </a>
          )}
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm text-muted-foreground hover:text-gold">
              <WhatsAppIcon className="mt-0.5 h-4 w-4 shrink-0" /> Chat on WhatsApp
            </a>
          )}
          {info.email && (
            <a href={`mailto:${info.email}`} className="flex items-start gap-2 break-all text-sm text-muted-foreground hover:text-gold">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.6} /> {info.email}
            </a>
          )}
          {info.address && (
            <p className="flex items-start gap-2 whitespace-pre-line text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.6} /> {info.address}
            </p>
          )}
          {!info.phone && !info.email && !whatsapp && (
            <FooterLink href="/contact">Contact us</FooterLink>
          )}
        </FooterColumn>
      </div>

      <div className="border-t border-border">
        <div className="container flex flex-col gap-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Lorka Jewellers. All rights reserved.
            {info.gstin && <span className="ml-2">GSTIN: {info.gstin}</span>}
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {POLICY_PAGES.map((p) => (
              <Link key={p.slug} href={`/policies/${p.slug}`} className="hover:text-gold">
                {p.title}
              </Link>
            ))}
          </nav>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-gold" strokeWidth={1.6} />
            Secure payments by Razorpay · UPI · Cards · Netbanking
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">{title}</p>
      <div className="mt-4 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-gold">
      {children}
    </Link>
  );
}

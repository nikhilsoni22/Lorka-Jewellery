import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MapPin, MessageSquare, Phone } from 'lucide-react';
import { ALLOWED_ORDER_CITIES } from '@lorka/types';
import { getSettings, whatsappLink } from '@/lib/store';
import { WhatsAppIcon } from '@/components/whatsapp-icon';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Lorka Jewellers — call, WhatsApp, email or raise a support ticket.',
};

export default async function ContactPage() {
  const { storeInfo: info } = await getSettings();
  const whatsapp = whatsappLink(info.whatsappNumber, 'Hi Lorka Jewellers!');

  const channels = [
    info.phone && { icon: Phone, label: 'Call us', value: info.phone, href: `tel:${info.phone}` },
    whatsapp && { icon: WhatsAppIcon, label: 'WhatsApp', value: 'Chat with us', href: whatsapp, external: true },
    info.email && { icon: Mail, label: 'Email', value: info.email, href: `mailto:${info.email}` },
    { icon: MessageSquare, label: 'Support ticket', value: 'Raise a ticket from your account', href: '/account/tickets' },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; label: string; value: string; href: string; external?: boolean }[];

  return (
    <main className="container max-w-4xl py-14 md:py-20">
      <div className="text-center animate-fade-in-up">
        <p className="text-xs font-medium uppercase tracking-[0.35em] text-gold">We&apos;re here to help</p>
        <h1 className="mt-3 text-3xl md:text-4xl">Contact Us</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Questions about a piece, sizing, an order or a custom design? Reach out — we usually reply the same day.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {channels.map(({ icon: Icon, label, value, href, external }, i) => (
          <a
            key={label}
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-md animate-fade-in-up"
            style={{ animationDelay: `${100 + i * 80}ms` }}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-gold transition-colors group-hover:bg-gold group-hover:text-gold-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
              <span className="block truncate font-medium">{value}</span>
            </span>
          </a>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <p className="flex items-start gap-3 text-sm">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" strokeWidth={1.6} />
          <span>
            {info.address ? <span className="whitespace-pre-line">{info.address}</span> : 'Lorka Jewellers'}
            <span className="mt-1 block text-muted-foreground">
              We currently deliver within {ALLOWED_ORDER_CITIES.join(' and ')}.
            </span>
          </span>
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Looking for an order? <Link href="/track-order" className="text-gold underline-offset-4 hover:underline">Track it here</Link>.
      </p>
    </main>
  );
}

import { getSettings, whatsappLink } from '@/lib/store';
import { Reveal } from '@/components/reveal';
import { WhatsAppIcon } from '@/components/whatsapp-icon';

/** "Need help choosing?" invitation — only rendered once a WhatsApp number is set in Admin → Settings. */
export async function ConciergeBand() {
  const { storeInfo } = await getSettings();
  const href = whatsappLink(storeInfo.whatsappNumber, 'Hi Lorka Jewellers! I need help choosing a piece.');
  if (!href) return null;

  return (
    <section className="container pb-8 pt-4">
      <Reveal className="border border-border bg-secondary/60 px-6 py-16 text-center sm:px-12 sm:py-20">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.35em] text-gold">Personal Assistance</p>
        <h2 className="mx-auto mt-4 max-w-2xl text-balance text-[32px] font-normal leading-tight sm:text-[42px]">
          Not sure which yantra is right for you?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-balance text-[15px] font-light text-muted-foreground">
          Talk to us on WhatsApp — we&apos;ll help you choose, size and gift the perfect piece.
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-9 inline-flex h-[52px] items-center gap-3 bg-espresso px-9 text-[11.5px] font-medium uppercase tracking-[0.22em] text-ivory transition-colors duration-300 hover:bg-gold"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Chat with Us
        </a>
      </Reveal>
    </section>
  );
}

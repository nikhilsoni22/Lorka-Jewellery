import { getSettings, whatsappLink } from '@/lib/store';
import { WhatsAppIcon } from '@/components/whatsapp-icon';

/** Floating "chat with us" button — hidden until a WhatsApp number is set in Admin → Settings. */
export async function WhatsAppFloat() {
  const { storeInfo } = await getSettings();
  const href = whatsappLink(storeInfo.whatsappNumber, 'Hi Lorka Jewellers! I have a question.');
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-transform hover:scale-110 md:bottom-6 md:right-6"
    >
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ripple" aria-hidden />
      <WhatsAppIcon className="relative h-7 w-7" />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-md bg-foreground px-3 py-1.5 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100 md:block">
        Chat with us
      </span>
    </a>
  );
}

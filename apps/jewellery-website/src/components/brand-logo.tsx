import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Monogram + stacked "LORKA / JEWELLERS" wordmark. `tone="light"` is for dark backgrounds. */
export function BrandLogo({
  tone = 'dark',
  className,
  priority = false,
}: {
  tone?: 'dark' | 'light';
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link href="/" aria-label="Lorka Jewellers — home" className={cn('flex items-center gap-3', className)}>
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-gold/40 ring-offset-2 ring-offset-transparent">
        <Image
          src="/images/lorka_jewellers_logo.jpeg"
          alt=""
          fill
          sizes="40px"
          className="object-cover"
          priority={priority}
        />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-serif text-[22px] font-medium tracking-[0.34em]',
            tone === 'light' ? 'text-ivory' : 'text-foreground',
          )}
        >
          LORKA
        </span>
        <span
          className={cn(
            'mt-1 text-[8.5px] font-medium tracking-[0.62em]',
            tone === 'light' ? 'text-gold-light' : 'text-gold',
          )}
        >
          JEWELLERS
        </span>
      </span>
    </Link>
  );
}

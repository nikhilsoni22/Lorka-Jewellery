import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  align = 'center',
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Optional "View all" style link, shown at the right on wide screens. */
  action?: { label: string; href: string };
  align?: 'center' | 'left';
}) {
  const actionLink = action && (
    <Link
      href={action.href}
      className="underline-trigger group inline-flex shrink-0 items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-foreground transition-colors hover:text-gold"
    >
      <span className="link-underline pb-0.5">{action.label}</span>
      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
    </Link>
  );

  return (
    <div
      className={cn(
        align === 'center' ? 'text-center' : 'flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between',
      )}
    >
      <div className={cn(align === 'center' && 'mx-auto max-w-2xl')}>
        {eyebrow && (
          <p className="mb-4 text-[10.5px] font-medium uppercase tracking-[0.35em] text-gold">{eyebrow}</p>
        )}
        <h2 className="text-[34px] font-normal leading-[1.08] sm:text-[44px]">{title}</h2>
        {subtitle && (
          <p className={cn('mt-4 max-w-lg text-[15px] font-light leading-relaxed text-muted-foreground', align === 'center' && 'mx-auto')}>
            {subtitle}
          </p>
        )}
      </div>
      {actionLink && (align === 'center' ? <div className="mt-6">{actionLink}</div> : actionLink)}
    </div>
  );
}

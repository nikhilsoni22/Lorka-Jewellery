import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shown to a blocked customer wherever they'd otherwise order or review — points them to support. */
export function BlockedAccountNotice({
  reason,
  showTicketLink = true,
  className,
}: {
  reason?: string;
  showTicketLink?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-destructive/30 bg-destructive/5 p-5', className)}>
      <p className="flex items-center gap-2 font-medium text-destructive">
        <ShieldAlert className="h-5 w-5 shrink-0" /> Your account has been blocked
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        You can&apos;t place orders or write reviews right now.
        {reason && (
          <>
            {' '}
            Reason: <span className="text-foreground">{reason}</span>
          </>
        )}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        If you think this is a mistake, please raise a support ticket and our team will get back to you.
      </p>
      {showTicketLink && (
        <Link
          href="/account/tickets"
          className="mt-4 inline-block bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-background"
        >
          Raise a support ticket
        </Link>
      )}
    </div>
  );
}

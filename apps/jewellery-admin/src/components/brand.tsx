import { cn } from '@/lib/utils';

/** Lorka Jewellers wordmark with a small diamond glyph. */
export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className="text-foreground"
      >
        <path
          d="M16 3l7 7-7 19-7-19 7-7z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M9 10h14M16 3l-4 7 4 19 4-19-4-7z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" opacity="0.5" />
      </svg>
      {!compact && (
        <span className="font-serif text-lg tracking-[0.2em] uppercase">
          Lorka
          <span className="text-muted-foreground"> Admin</span>
        </span>
      )}
    </div>
  );
}

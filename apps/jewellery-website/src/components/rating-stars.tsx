import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Read-only stars with partial fill for fractional ratings (e.g. 4.3). */
export function RatingStars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`Rated ${rating} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <span key={i} className="relative inline-block h-[1em] w-[1em]">
            <Star className="absolute inset-0 h-full w-full text-gold/30" strokeWidth={1.5} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="h-[1em] w-[1em] fill-gold text-gold" strokeWidth={1.5} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

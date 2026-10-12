import type { OrderResponse } from '@lorka/types';
import { cn } from '@/lib/utils';
import { getTrackingState } from '@/lib/order-tracking';

/** Compact, static version of the tracking stepper for order lists. */
export function OrderMiniProgress({ order }: { order: OrderResponse }) {
  const { steps, currentIndex, cancelled, final } = getTrackingState(order);
  const fraction = steps.length > 1 ? currentIndex / (steps.length - 1) : 0;

  return (
    <div>
      <div className="relative mx-1.5 h-1 rounded-full bg-border">
        <div
          className={cn(
            'absolute inset-y-0 left-0 origin-left rounded-full animate-grow-x',
            cancelled ? 'bg-gradient-to-r from-gold to-destructive' : 'bg-gold-gradient',
          )}
          style={{ width: `${fraction * 100}%` }}
        />
        {steps.map((step, i) => {
          const reached = i <= currentIndex;
          return (
            <span
              key={step.key}
              className={cn(
                'absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors',
                reached
                  ? step.key === 'cancelled'
                    ? 'border-destructive bg-destructive'
                    : 'border-gold bg-gold'
                  : 'border-border bg-card',
              )}
              style={{ left: `${steps.length > 1 ? (i / (steps.length - 1)) * 100 : 0}%` }}
            >
              {i === currentIndex && !final && (
                <span className="absolute inset-[-2px] rounded-full bg-gold/50 animate-ripple" />
              )}
            </span>
          );
        })}
      </div>
      {/* Labels sit under the dots on wider screens; on phones the card's status badge says it. */}
      <div className="mt-2.5 hidden justify-between text-[10px] font-medium uppercase tracking-wide sm:flex">
        {steps.map((step, i) => (
          <span
            key={step.key}
            className={cn(
              i === currentIndex
                ? step.key === 'cancelled'
                  ? 'text-destructive'
                  : 'text-foreground'
                : 'text-muted-foreground',
            )}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

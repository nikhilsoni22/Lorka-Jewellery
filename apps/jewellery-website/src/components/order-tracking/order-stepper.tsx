'use client';

import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Check, CircleX, PackageCheck, ShoppingBag, Truck, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime, type TrackingState, type TrackingStep, type TrackingStepKey } from '@/lib/order-tracking';

/** How long the progress line takes to travel from one step to the next. */
const STEP_MS = 550;

const ICONS: Record<TrackingStepKey, LucideIcon> = {
  pending: ShoppingBag,
  confirmed: BadgeCheck,
  shipped: Truck,
  delivered: PackageCheck,
  cancelled: CircleX,
};

/**
 * Animates from the previously shown step to the current one: on first mount the line fills from
 * "Order Placed", and when a live update moves the order forward it continues from where it was.
 * Each node lights up exactly when the line reaches it.
 */
function useStepAnimation(currentIndex: number) {
  const [shown, setShown] = useState(-1);
  const [from, setFrom] = useState(-1);
  const shownRef = useRef(-1);

  useEffect(() => {
    // Two frames so the empty state paints first and the CSS transitions actually run.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setFrom(shownRef.current);
        shownRef.current = currentIndex;
        setShown(currentIndex);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [currentIndex]);

  const base = Math.max(from, 0);
  return {
    shown,
    lineMs: Math.max(1, Math.abs(shown - base)) * STEP_MS,
    /** Delay before step `i` activates — only steps newly reached in this transition wait. */
    delayFor: (i: number) => (i > base && i <= shown ? (i - base) * STEP_MS : 0),
  };
}

function StepNode({
  step,
  active,
  current,
  final,
  delay,
}: {
  step: TrackingStep;
  active: boolean;
  current: boolean;
  final: boolean;
  delay: number;
}) {
  const Icon = ICONS[step.key];
  const isCancel = step.key === 'cancelled';
  const live = current && active && !final;

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
      {live && (
        <>
          <span
            className="absolute inset-0 rounded-full bg-gold/40 animate-ripple"
            style={{ animationDelay: `${delay}ms` }}
          />
          <span
            className="absolute inset-0 rounded-full bg-gold/30 animate-ripple"
            style={{ animationDelay: `${delay + 900}ms` }}
          />
        </>
      )}
      <span
        className={cn(
          'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          active
            ? isCancel
              ? 'scale-100 border-destructive bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30'
              : 'scale-100 border-gold bg-gold-gradient text-gold-foreground shadow-lg shadow-gold/30'
            : 'scale-90 border-border bg-card text-muted-foreground',
          active && current && final && !isCancel && 'animate-glow',
        )}
        style={{ transitionDelay: `${delay}ms` }}
      >
        <Icon className={cn('h-5 w-5', live && step.key === 'shipped' && 'animate-bob')} strokeWidth={1.8} />
      </span>
      {active && !current && (
        <span
          className="absolute -bottom-0.5 -right-0.5 z-20 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-olive text-olive-foreground animate-pop"
          style={{ animationDelay: `${delay + 250}ms` }}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

function StepTime({ step, active }: { step: TrackingStep; active: boolean }) {
  if (!active) return <p className="mt-0.5 text-xs text-muted-foreground/70">Upcoming</p>;
  return (
    <p className="mt-0.5 text-xs text-muted-foreground">{step.at ? formatDateTime(step.at) : 'Completed'}</p>
  );
}

export function OrderStepper({ state, currentMessage }: { state: TrackingState; currentMessage?: string }) {
  const { steps, currentIndex, cancelled, final } = state;
  const { shown, lineMs, delayFor } = useStepAnimation(currentIndex);
  const n = steps.length;
  const fraction = n > 1 ? Math.max(shown, 0) / (n - 1) : 0;
  const fillClass = cancelled ? 'bg-gradient-to-r from-gold via-gold to-destructive' : 'bg-gold-gradient';

  return (
    <div>
      {/* Desktop: horizontal track */}
      <div className="relative hidden md:block">
        <div
          className="absolute top-[22px] h-1 rounded-full bg-border"
          style={{ left: `${50 / n}%`, right: `${50 / n}%` }}
        >
          <div
            className={cn('relative h-full overflow-hidden rounded-full', fillClass)}
            style={{ width: `${fraction * 100}%`, transition: `width ${lineMs}ms linear` }}
          >
            {!final && <div className="absolute inset-0 bg-shimmer animate-shimmer" />}
          </div>
        </div>
        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {steps.map((step, i) => {
            const active = i <= shown;
            const delay = delayFor(i);
            return (
              <li key={step.key} className="flex flex-col items-center px-2 text-center">
                <StepNode step={step} active={active} current={i === currentIndex} final={final} delay={delay} />
                <p
                  className={cn(
                    'mt-3 text-sm transition-colors duration-500',
                    active
                      ? step.key === 'cancelled'
                        ? 'font-semibold text-destructive'
                        : 'font-semibold text-foreground'
                      : 'text-muted-foreground',
                  )}
                  style={{ transitionDelay: `${delay}ms` }}
                >
                  {step.label}
                </p>
                <StepTime step={step} active={active} />
              </li>
            );
          })}
        </ol>
      </div>

      {/* Mobile: vertical track */}
      <ol className="md:hidden">
        {steps.map((step, i) => {
          const active = i <= shown;
          const current = i === currentIndex;
          const delay = delayFor(i);
          const segmentFilled = i < shown;
          const segmentDelay = segmentFilled ? Math.max(0, delayFor(i + 1) - STEP_MS) : 0;
          const intoCancel = steps[i + 1]?.key === 'cancelled';
          return (
            <li key={step.key} className="relative flex gap-4 pb-7 last:pb-0">
              {i < n - 1 && (
                <div className="absolute bottom-0 left-6 top-12 w-1 -translate-x-1/2 overflow-hidden rounded-full bg-border">
                  <div
                    className={cn(
                      'w-full rounded-full',
                      intoCancel ? 'bg-gradient-to-b from-gold to-destructive' : 'bg-gold-gradient',
                    )}
                    style={{
                      height: segmentFilled ? '100%' : '0%',
                      transition: `height ${STEP_MS}ms linear`,
                      transitionDelay: `${segmentDelay}ms`,
                    }}
                  />
                </div>
              )}
              <StepNode step={step} active={active} current={current} final={final} delay={delay} />
              <div className="min-w-0 pt-1.5">
                <p
                  className={cn(
                    'text-sm transition-colors duration-500',
                    active
                      ? step.key === 'cancelled'
                        ? 'font-semibold text-destructive'
                        : 'font-semibold text-foreground'
                      : 'text-muted-foreground',
                  )}
                  style={{ transitionDelay: `${delay}ms` }}
                >
                  {step.label}
                </p>
                <StepTime step={step} active={active} />
                {current && active && currentMessage && (
                  <p
                    className="mt-2 rounded-lg bg-secondary/70 px-3 py-2 text-xs leading-relaxed text-secondary-foreground animate-fade-in-up"
                    style={{ animationDelay: `${delay + 200}ms` }}
                  >
                    {currentMessage}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

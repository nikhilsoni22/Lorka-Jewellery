'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BadgeCheck,
  CircleX,
  CreditCard,
  FileText,
  Gift,
  Hammer,
  LifeBuoy,
  MapPin,
  PackageCheck,
  PackageSearch,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { OrderResponse } from '@lorka/types';
import { useOrderLookup } from '@/lib/use-order-lookup';
import { optimizedImage } from '@/lib/image';
import { cn } from '@/lib/utils';
import {
  STATUS_COPY,
  formatDateTime,
  formatDay,
  getTrackingState,
  isInvoiceAvailable,
  paymentMethodLabel,
} from '@/lib/order-tracking';
import { UpiPaymentPanel } from '@/components/upi-payment-panel';
import { OrderStepper } from './order-stepper';
import { TrackOrderForm } from './track-order-form';

/** Guest lookups share the API's 20-requests-per-15-min limit, so they poll gently. */
const GUEST_POLL_MS = 60_000;
const OWNER_POLL_MS = 15_000;

const HERO_ICONS: Record<OrderResponse['status'], LucideIcon> = {
  pending: ShoppingBag,
  confirmed: BadgeCheck,
  shipped: Truck,
  delivered: PackageCheck,
  cancelled: CircleX,
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function timeAgo(ms: number, now: number) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function OrderTrackingView({ orderNumber, phone }: { orderNumber: string; phone: string }) {
  const { fetchOrder, sourceRef, authStatus, ready } = useOrderLookup(orderNumber, phone);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const statusRef = useRef<OrderResponse['status'] | null>(null);
  const lastSyncedRef = useRef<number | null>(null);
  const now = useNow(30_000);

  const sync = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const next = await fetchOrder();
        const previous = statusRef.current;
        if (previous && previous !== next.status) {
          const copy = STATUS_COPY[next.status];
          toast.success(copy.title, { description: copy.update });
        }
        statusRef.current = next.status;
        lastSyncedRef.current = Date.now();
        setOrder(next);
        setError(null);
        setLastSynced(lastSyncedRef.current);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong';
        if (!statusRef.current) setError(message);
        else if (manual) toast.error(message);
      } finally {
        if (manual) setRefreshing(false);
      }
    },
    [fetchOrder],
  );

  useEffect(() => {
    if (ready) void sync();
  }, [ready, sync]);

  const loaded = order !== null;
  const final = order ? getTrackingState(order).final : false;

  // Live updates: poll while the tab is visible and the order can still change.
  useEffect(() => {
    if (!loaded || final) return;
    const every = sourceRef.current === 'mine' ? OWNER_POLL_MS : GUEST_POLL_MS;
    const id = setInterval(() => {
      if (!document.hidden) void sync();
    }, every);
    const onVisible = () => {
      if (!document.hidden && Date.now() - (lastSyncedRef.current ?? 0) > every) void sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loaded, final, sync, sourceRef]);

  if (error) {
    return (
      <main className="container max-w-lg py-16">
        <div className="rounded-2xl border border-border bg-card p-8 text-center animate-scale-in">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-gold">
            <PackageSearch className="h-7 w-7" strokeWidth={1.6} />
          </span>
          <h1 className="mt-5 text-2xl">We couldn&apos;t find that order</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please check the order number and the phone number you used at checkout.
          </p>
          <div className="mt-8 text-left">
            <TrackOrderForm orderNumber={orderNumber} phone={phone} />
          </div>
        </div>
      </main>
    );
  }

  if (!order) return <TrackingSkeleton />;

  const state = getTrackingState(order);
  const copy = STATUS_COPY[order.status];
  const HeroIcon = HERO_ICONS[order.status];
  const placedAt = order.statusHistory[0]?.at ?? order.createdAt;
  const deliveredAt = order.status === 'delivered' ? state.steps[state.currentIndex]?.at : undefined;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const updates = [...order.statusHistory].reverse();
  const cancelled = state.cancelled;
  const delivered = order.status === 'delivered';

  return (
    <main className="container max-w-5xl py-10 md:py-14">
      <Link
        href={authStatus === 'authenticated' ? '/account/orders' : '/track-order'}
        className="group inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        {authStatus === 'authenticated' ? 'My Orders' : 'Track another order'}
      </Link>

      {/* Title row */}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-in-up">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-gold">Order Tracking</p>
          <h1 className="mt-2 text-3xl md:text-4xl">{order.orderNumber}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Placed on {formatDay(placedAt)} · {itemCount} item{itemCount !== 1 ? 's' : ''} · {inr(order.total)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!state.final ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live · updated {lastSynced ? timeAgo(lastSynced, now) : 'just now'}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void sync(true)}
            disabled={refreshing}
            aria-label="Refresh tracking"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-gold/50 hover:text-gold disabled:opacity-60"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Status hero + stepper */}
      <section
        className="relative mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm animate-fade-in-up"
        style={{ animationDelay: '80ms' }}
      >
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl',
            cancelled ? 'bg-destructive/10' : 'bg-gold/15',
          )}
        />
        <div className="relative flex items-start gap-4 p-6 md:gap-5 md:p-8">
          <div className="relative shrink-0">
            <span
              key={order.status}
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg animate-pop md:h-16 md:w-16',
                cancelled
                  ? 'bg-destructive text-destructive-foreground shadow-destructive/25'
                  : 'bg-gold-gradient text-gold-foreground shadow-gold/30',
              )}
            >
              <HeroIcon className="h-7 w-7 md:h-8 md:w-8" strokeWidth={1.6} />
            </span>
            {delivered && (
              <>
                <Sparkles className="absolute -right-3 -top-3 h-4 w-4 text-gold animate-twinkle" />
                <Sparkles
                  className="absolute -bottom-2 -left-3 h-3 w-3 text-gold-light animate-twinkle"
                  style={{ animationDelay: '0.8s' }}
                />
                <Sparkles
                  className="absolute -right-4 bottom-1 h-2.5 w-2.5 text-gold animate-twinkle"
                  style={{ animationDelay: '1.6s' }}
                />
              </>
            )}
          </div>
          <div key={`copy-${order.status}`} className="min-w-0 animate-fade-in">
            <h2 className={cn('text-2xl md:text-3xl', cancelled && 'text-destructive')}>{copy.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground md:text-base">{copy.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {deliveredAt && <Chip tone="olive">Delivered on {formatDay(deliveredAt)}</Chip>}
              {order.status === 'shipped' && (
                <Chip tone="gold">
                  <Truck className="h-3.5 w-3.5" /> Arriving soon
                </Chip>
              )}
              {order.hasBuildItems && !cancelled && !delivered && (
                <Chip tone="muted">
                  <Hammer className="h-3.5 w-3.5" />
                  {order.estimatedReadyDate
                    ? `Made-to-order · ready by ${formatDay(order.estimatedReadyDate)}`
                    : 'Made-to-order · timeline being confirmed'}
                </Chip>
              )}
            </div>
          </div>
        </div>

        <div className="relative border-t border-border bg-secondary/30 px-6 py-8 md:px-8 md:py-10">
          <OrderStepper state={state} currentMessage={copy.update} />
        </div>
      </section>

      <UpiPaymentPanel order={order} onUpdated={setOrder} className="mt-6" />

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Updates feed */}
          <Card title="Order updates" delay={160}>
            <ol className="relative">
              {updates.map((event, i) => {
                const latest = i === 0;
                const isCancel = event.status === 'cancelled';
                return (
                  <li
                    key={`${event.status}-${event.at}`}
                    className="relative flex gap-4 pb-6 last:pb-0 animate-fade-in-up"
                    style={{ animationDelay: `${220 + i * 90}ms` }}
                  >
                    {i < updates.length - 1 && (
                      <span className="absolute bottom-0 left-[7px] top-5 w-px bg-border" aria-hidden />
                    )}
                    <span
                      className={cn(
                        'relative mt-1 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border-2',
                        latest
                          ? isCancel
                            ? 'border-destructive bg-destructive'
                            : 'border-gold bg-gold'
                          : 'border-border bg-card',
                      )}
                    >
                      {latest && !state.final && (
                        <span className="absolute inset-0 rounded-full bg-gold/50 animate-ripple" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className={cn('text-sm', latest ? 'font-semibold text-foreground' : 'text-foreground/80')}>
                        {STATUS_COPY[event.status].update}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          {/* Items */}
          <Card title={`Items in this order (${itemCount})`} delay={240}>
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={`${item.productId}-${item.isBuildOrder}`} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={optimizedImage(item.image, 160)} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Qty {item.quantity} × {inr(item.unitPrice)}
                    </p>
                    {item.isBuildOrder && (
                      <span className="mt-1.5 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
                        Build to Order
                      </span>
                    )}
                  </div>
                  <p className="font-serif">{inr(item.subtotal)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Delivery address" icon={MapPin} delay={200}>
            <p className="text-sm font-medium">{order.customerName}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Phone: {order.customerPhone}</p>
          </Card>

          <Card title="Payment summary" icon={CreditCard} delay={280}>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd>{inr(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Coupon {order.couponCode}</dt>
                  <dd>−{inr(order.discount)}</dd>
                </div>
              )}
              {order.charges.map((charge) => (
                <div key={charge.name} className="flex justify-between text-muted-foreground">
                  <dt>{charge.name}</dt>
                  <dd>{inr(charge.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-3 font-serif text-lg">
                <dt>Total</dt>
                <dd>{inr(order.total)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2.5 text-xs">
              <span className="text-muted-foreground">
                {paymentMethodLabel(order)}
              </span>
              <PaymentPill order={order} />
            </div>
            {order.refundedAmount > 0 && (
              <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                {inr(order.refundedAmount)} refunded to your original payment method
                {order.refundedAt ? ` on ${formatDay(order.refundedAt)}` : ''}. Banks usually take 5–7 working days to
                show it.
              </p>
            )}
            {isInvoiceAvailable(order) ? (
              <Link
                href={`/invoice?orderNumber=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(order.customerPhone)}`}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.15em] text-gold underline-offset-4 hover:underline"
              >
                <FileText className="h-3.5 w-3.5" /> Download invoice
              </Link>
            ) : (
              order.status !== 'cancelled' && (
                <p className="mt-4 text-xs text-muted-foreground">Your invoice will be available once the payment is verified.</p>
              )
            )}
          </Card>

          {order.giftWrap && (
            <Card title="Gift" icon={Gift} delay={320}>
              <p className="text-sm">This order will be gift wrapped.</p>
              {order.giftMessage && (
                <p className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 font-serif text-sm italic">“{order.giftMessage}”</p>
              )}
            </Card>
          )}

          <section
            className="rounded-2xl border border-gold/30 bg-gradient-to-br from-secondary/80 to-card p-6 animate-fade-in-up"
            style={{ animationDelay: '360ms' }}
          >
            <div className="flex items-start gap-3">
              <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-gold" strokeWidth={1.7} />
              <div>
                <p className="font-serif text-lg">Need help with this order?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Our team is happy to help with delivery, sizing or anything else.
                </p>
                <Link
                  href="/account/tickets"
                  className="mt-3 inline-block text-xs font-medium uppercase tracking-[0.15em] text-gold underline-offset-4 hover:underline"
                >
                  Contact support
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  icon: Icon,
  delay,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  delay: number;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border border-border bg-card p-6 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="mb-5 flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {Icon && <Icon className="h-4 w-4 text-gold" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Chip({ tone, children }: { tone: 'gold' | 'olive' | 'muted'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        tone === 'gold' && 'bg-gold/15 text-foreground',
        tone === 'olive' && 'bg-olive/15 text-olive',
        tone === 'muted' && 'bg-secondary text-secondary-foreground',
      )}
    >
      {children}
    </span>
  );
}

function PaymentPill({ order }: { order: OrderResponse }) {
  if (order.paymentStatus === 'paid') {
    return <span className="rounded-full bg-olive/15 px-2.5 py-0.5 font-medium text-olive">Paid</span>;
  }
  if (order.paymentStatus === 'refunded') {
    return <span className="rounded-full bg-sky-100 px-2.5 py-0.5 font-medium text-sky-800">Refunded</span>;
  }
  if (order.paymentStatus === 'failed') {
    return (
      <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 font-medium text-destructive">
        {order.paymentMethod === 'upi' ? 'Not verified' : 'Failed'}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-800">
      {order.paymentMethod === 'cod'
        ? 'Pay on delivery'
        : order.paymentMethod === 'upi' && order.upiReference
          ? 'Verifying'
          : 'Pending'}
    </span>
  );
}

function TrackingSkeleton() {
  const block = 'rounded-lg bg-muted relative overflow-hidden';
  const shine = <div className="absolute inset-0 bg-shimmer animate-shimmer" />;
  return (
    <main className="container max-w-5xl py-10 md:py-14" aria-busy="true" aria-label="Loading order">
      <div className={cn(block, 'h-4 w-28')}>{shine}</div>
      <div className={cn(block, 'mt-6 h-9 w-72')}>{shine}</div>
      <div className={cn(block, 'mt-3 h-4 w-56')}>{shine}</div>
      <div className="mt-8 rounded-2xl border border-border bg-card p-8">
        <div className="flex gap-5">
          <div className={cn(block, 'h-16 w-16 rounded-2xl')}>{shine}</div>
          <div className="flex-1 space-y-3">
            <div className={cn(block, 'h-7 w-48')}>{shine}</div>
            <div className={cn(block, 'h-4 w-full max-w-md')}>{shine}</div>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className={cn(block, 'h-12 w-12 rounded-full')}>{shine}</div>
              <div className={cn(block, 'h-3 w-16')}>{shine}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

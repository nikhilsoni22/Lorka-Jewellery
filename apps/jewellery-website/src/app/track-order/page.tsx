import type { Metadata } from 'next';
import { BadgeCheck, PackageCheck, ShoppingBag, Truck } from 'lucide-react';
import { OrderTrackingView } from '@/components/order-tracking/order-tracking-view';
import { TrackOrderForm } from '@/components/order-tracking/track-order-form';

export const metadata: Metadata = {
  title: 'Track Your Order',
  robots: { index: false },
};

const JOURNEY = [
  { icon: ShoppingBag, label: 'Placed' },
  { icon: BadgeCheck, label: 'Confirmed' },
  { icon: Truck, label: 'Shipped' },
  { icon: PackageCheck, label: 'Delivered' },
];

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; phone?: string }>;
}) {
  const { orderNumber, phone } = await searchParams;

  if (orderNumber?.trim() && phone?.trim()) {
    // Keyed so looking up a different order starts a fresh view (and fresh animations).
    return (
      <OrderTrackingView
        key={`${orderNumber}:${phone}`}
        orderNumber={orderNumber.trim()}
        phone={phone.trim()}
      />
    );
  }

  return (
    <main className="container max-w-xl py-16 md:py-20">
      <div className="text-center animate-fade-in-up">
        <p className="text-xs font-medium uppercase tracking-[0.35em] text-gold">Order Tracking</p>
        <h1 className="mt-3 text-3xl md:text-4xl">Where is my order?</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter your order number and phone number to follow your jewellery every step of the way.
        </p>
      </div>

      <div className="mt-10 flex items-center justify-between px-2 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {JOURNEY.map(({ icon: Icon, label }, i) => (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-card text-gold animate-pop"
                style={{ animationDelay: `${250 + i * 150}ms` }}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
            </div>
            {i < JOURNEY.length - 1 && (
              <span
                className="mx-2 mb-6 h-px flex-1 origin-left bg-gold/40 animate-grow-x"
                style={{ animationDelay: `${330 + i * 150}ms` }}
              />
            )}
          </div>
        ))}
      </div>

      <div
        className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm animate-fade-in-up md:p-8"
        style={{ animationDelay: '200ms' }}
      >
        <TrackOrderForm />
      </div>
    </main>
  );
}

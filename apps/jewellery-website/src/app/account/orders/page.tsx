'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Loader2 } from 'lucide-react';
import type { OrderResponse } from '@lorka/types';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { trackOrderHref } from '@/lib/order-tracking';
import { OrderMiniProgress } from '@/components/order-tracking/order-mini-progress';

type Tab = 'pending' | 'completed' | 'all';

const STATUS_STYLES: Record<OrderResponse['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

function isPending(status: OrderResponse['status']) {
  return status === 'pending' || status === 'confirmed' || status === 'shipped';
}

export default function AccountOrdersPage() {
  const { status: authStatus } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderResponse[] | null>(null);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/account/login?redirect=/account/orders');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    apiClient
      .get<OrderResponse[]>('/orders/mine?limit=100')
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [authStatus]);

  if (authStatus !== 'authenticated' || orders === null) {
    return (
      <main className="container py-20">
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  const filtered = orders.filter((o) => {
    if (tab === 'pending') return isPending(o.status);
    if (tab === 'completed') return o.status === 'delivered';
    return true;
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
    { key: 'all', label: 'All Orders' },
  ];

  return (
    <main className="container py-12">
      <h1 className="text-3xl">My Orders</h1>

      <div className="mt-6 flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-gold text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">No orders here yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {filtered.map((order, i) => (
            <Link
              key={order.id}
              href={trackOrderHref(order)}
              className="group block rounded-xl border border-border bg-card p-4 transition-all duration-300 animate-fade-in-up hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-md sm:p-5"
              style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex shrink-0 -space-x-3">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div
                        key={`${item.productId}-${idx}`}
                        className="h-12 w-12 overflow-hidden rounded-lg border-2 border-card bg-muted"
                      >
                        {item.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{order.orderNumber}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item
                      {order.items.length !== 1 ? 's' : ''}
                    </p>
                    {order.hasBuildItems && (
                      <p className="mt-0.5 text-xs text-gold">
                        {order.estimatedReadyDate
                          ? `Build ready by ${new Date(order.estimatedReadyDate).toLocaleDateString()}`
                          : 'Build timeline pending confirmation'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="font-serif">₹{order.total}</span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                      STATUS_STYLES[order.status],
                    )}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-end gap-4">
                <div className="flex-1">
                  <OrderMiniProgress order={order} />
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium uppercase tracking-wide text-gold">
                  Track
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

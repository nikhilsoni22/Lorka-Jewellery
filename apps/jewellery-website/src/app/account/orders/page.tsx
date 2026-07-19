'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { OrderResponse } from '@lorka/types';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

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
          {filtered.map((order) => (
            <Link
              key={order.id}
              href={`/order-confirmation?orderNumber=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(order.customerPhone)}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-gold/40"
            >
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item
                  {order.items.length !== 1 ? 's' : ''}
                </p>
                {order.hasBuildItems && (
                  <p className="mt-1 text-xs text-gold">
                    {order.estimatedReadyDate
                      ? `Build ready by ${new Date(order.estimatedReadyDate).toLocaleDateString()}`
                      : 'Build timeline pending confirmation'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
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
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

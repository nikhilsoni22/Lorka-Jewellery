'use client';

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import type { OrderStatus } from '@lorka/types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useOrders } from '@/lib/hooks/orders';
import { OrderTable } from '@/components/orders/order-table';

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as OrderStatus[];

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const { data, isLoading } = useOrders({
    search: search || undefined,
    status: status || undefined,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Orders</h1>
        <p className="mt-1 text-muted-foreground">View and manage customer orders.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, phone…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
          className="max-w-[180px]"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <OrderTable orders={data?.items ?? []} />
      )}
    </div>
  );
}

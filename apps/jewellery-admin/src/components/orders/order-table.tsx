'use client';

import Link from 'next/link';
import type { OrderResponse } from '@lorka/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT = {
  pending: 'outline',
  confirmed: 'secondary',
  shipped: 'default',
  delivered: 'success',
  cancelled: 'destructive',
} as const;

const PAYMENT_STATUS_VARIANT = {
  pending: 'outline',
  paid: 'success',
  failed: 'destructive',
} as const;

export function OrderTable({ orders }: { orders: OrderResponse[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        No orders yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order #</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id} className="cursor-pointer">
            <TableCell>
              <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                {order.orderNumber}
              </Link>
            </TableCell>
            <TableCell>
              <div>{order.customerName}</div>
              <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
            </TableCell>
            <TableCell className="text-muted-foreground">{order.items.length}</TableCell>
            <TableCell>₹{order.total}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <span className="text-xs capitalize text-muted-foreground">{order.paymentMethod}</span>
                <Badge variant={PAYMENT_STATUS_VARIANT[order.paymentStatus]}>{order.paymentStatus}</Badge>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
                {order.hasBuildItems && <Badge variant="outline">Build</Badge>}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

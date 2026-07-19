'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { OrderStatus } from '@lorka/types';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrder, useUpdateOrderStatus, useSetBuildEta } from '@/lib/hooks/orders';
import { extractMessage } from '@/lib/api-utils';

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as OrderStatus[];

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

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(params.id);
  const updateStatus = useUpdateOrderStatus(params.id);
  const setBuildEta = useSetBuildEta(params.id);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | ''>('');
  const [buildEtaInput, setBuildEtaInput] = useState('');

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return <p className="text-muted-foreground">Order not found.</p>;
  }

  const handleUpdateStatus = () => {
    if (!pendingStatus) return;
    updateStatus.mutate(pendingStatus, {
      onSuccess: () => {
        toast.success('Order status updated');
        setPendingStatus('');
      },
      onError: (err) => toast.error(extractMessage(err, 'Unable to update order status')),
    });
  };

  const handleSetBuildEta = () => {
    if (!buildEtaInput) return;
    setBuildEta.mutate(new Date(buildEtaInput).toISOString(), {
      onSuccess: () => toast.success('Build ETA updated'),
      onError: (err) => toast.error(extractMessage(err, 'Unable to update build ETA')),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl">{order.orderNumber}</h1>
          <p className="mt-1 text-muted-foreground">
            Placed on {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3 text-sm font-medium">Items</div>
            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 px-4 py-3">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="h-12 w-12 rounded-md border border-border object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-md border border-dashed border-border" />
                  )}
                  <div className="flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      {item.name}
                      {item.isBuildOrder && <Badge variant="outline">Build to Order</Badge>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ₹{item.unitPrice} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">₹{item.subtotal}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-border px-4 py-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              {order.charges.map((charge) => (
                <div key={charge.name} className="flex justify-between text-muted-foreground">
                  <span>{charge.name}</span>
                  <span>₹{charge.amount}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-medium">
                <span>Total</span>
                <span>₹{order.total}</span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium">Notes</p>
              <p className="mt-1 text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Customer</p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>{order.customerName}</p>
              <p>{order.customerPhone}</p>
              {order.customerEmail && <p>{order.customerEmail}</p>}
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Payment</p>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="capitalize">{order.paymentMethod}</span>
              <Badge variant={PAYMENT_STATUS_VARIANT[order.paymentStatus]}>{order.paymentStatus}</Badge>
            </div>
            {order.razorpayPaymentId && (
              <p className="mt-2 break-all text-xs text-muted-foreground">
                Payment ID: {order.razorpayPaymentId}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Shipping Address</p>
            <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Update Status</p>
            <div className="mt-2 flex gap-2">
              <Select
                value={pendingStatus}
                onChange={(e) => setPendingStatus(e.target.value as OrderStatus | '')}
              >
                <option value="" disabled>
                  Select status…
                </option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </Select>
              <Button
                onClick={handleUpdateStatus}
                disabled={!pendingStatus || updateStatus.isPending}
              >
                {updateStatus.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Update
              </Button>
            </div>
          </div>

          {order.hasBuildItems && (
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium">Build Timeline</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.estimatedReadyDate
                  ? `Ready by ${new Date(order.estimatedReadyDate).toLocaleDateString()}`
                  : 'Not confirmed yet — set an estimated ready date for the customer.'}
              </p>
              <div className="mt-2 flex gap-2">
                <Input
                  type="date"
                  value={buildEtaInput}
                  onChange={(e) => setBuildEtaInput(e.target.value)}
                />
                <Button
                  onClick={handleSetBuildEta}
                  disabled={!buildEtaInput || setBuildEta.isPending}
                >
                  {setBuildEta.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

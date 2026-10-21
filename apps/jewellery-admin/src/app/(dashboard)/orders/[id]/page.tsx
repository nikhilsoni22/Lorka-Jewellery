'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Gift, Loader2, MapPin, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { OrderStatus } from '@lorka/types';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useOrder,
  useUpdateOrderStatus,
  useSetBuildEta,
  useRefundOrder,
  useReviewPayment,
} from '@/lib/hooks/orders';
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
  refunded: 'secondary',
} as const;

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(params.id);
  const updateStatus = useUpdateOrderStatus(params.id);
  const setBuildEta = useSetBuildEta(params.id);
  const refund = useRefundOrder(params.id);
  const reviewPayment = useReviewPayment(params.id);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | ''>('');
  const [buildEtaInput, setBuildEtaInput] = useState('');
  const [refundInput, setRefundInput] = useState('');

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

  const refundable = Math.round((order.total - order.refundedAmount) * 100) / 100;
  const canRefund = order.paymentMethod === 'razorpay' && order.paymentStatus === 'paid' && refundable > 0;

  const handleRefund = () => {
    const amount = refundInput ? Number(refundInput) : undefined;
    if (amount !== undefined && (!(amount > 0) || amount > refundable)) {
      toast.error(`Enter an amount between ₹1 and ₹${refundable}`);
      return;
    }
    const shown = amount ?? refundable;
    if (!window.confirm(`Refund ₹${shown} to the customer's original payment method? This cannot be undone.`)) return;
    refund.mutate(amount, {
      onSuccess: () => {
        toast.success(`₹${shown} refund started — it reaches the customer in 5–7 working days`);
        setRefundInput('');
      },
      onError: (err) => toast.error(extractMessage(err, 'Unable to refund this payment')),
    });
  };

  const isUpi = order.paymentMethod === 'upi';
  const canReviewUpi = isUpi && order.status !== 'cancelled' && order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded';

  const handleVerifyPayment = () => {
    if (
      !window.confirm(
        `Have you checked your bank / UPI app and received ₹${order.total}${order.upiReference ? ` with UTR ${order.upiReference}` : ''}? The customer will be emailed that their payment is verified.`,
      )
    )
      return;
    reviewPayment.mutate(
      { action: 'verify' },
      {
        onSuccess: () => toast.success('Payment verified — customer emailed'),
        onError: (err) => toast.error(extractMessage(err, 'Unable to verify this payment')),
      },
    );
  };

  const handleRejectPayment = () => {
    const reason = window.prompt(
      'Why could the payment not be verified? This is included in the email to the customer (optional).',
      'We could not find this payment in our account.',
    );
    if (reason === null) return;
    reviewPayment.mutate(
      { action: 'reject', reason },
      {
        onSuccess: () => toast.success('Payment marked as not received — customer emailed'),
        onError: (err) => toast.error(extractMessage(err, 'Unable to reject this payment')),
      },
    );
  };

  const address = order.shippingAddress;
  const fullAddressText = [
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
  const mapsUrl = address.location
    ? `https://www.google.com/maps?q=${address.location.lat},${address.location.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddressText)}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Delivery location for order ${order.orderNumber}:\n${fullAddressText}\n${mapsUrl}`,
  )}`;

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
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon {order.couponCode}</span>
                  <span>−₹{order.discount}</span>
                </div>
              )}
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

          {order.giftWrap && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
                <Gift className="h-4 w-4" /> Gift wrap this order
              </p>
              {order.giftMessage ? (
                <p className="mt-2 text-sm italic text-amber-900">Card message: “{order.giftMessage}”</p>
              ) : (
                <p className="mt-1 text-sm text-amber-800">No message.</p>
              )}
            </div>
          )}

          {order.notes && (
            <div
              className={
                order.notes.includes('[Needs attention]')
                  ? 'rounded-lg border border-red-300 bg-red-50 p-4'
                  : 'rounded-lg border border-border p-4'
              }
            >
              <p className="text-sm font-medium">Notes</p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{order.notes}</p>
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
              <span className={isUpi ? 'uppercase' : 'capitalize'}>{order.paymentMethod}</span>
              <Badge variant={PAYMENT_STATUS_VARIANT[order.paymentStatus]}>{order.paymentStatus}</Badge>
            </div>
            {order.razorpayPaymentId && (
              <p className="mt-2 break-all text-xs text-muted-foreground">
                Payment ID: {order.razorpayPaymentId}
              </p>
            )}
            {isUpi && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {order.upiReference ? (
                  <p className="break-all">
                    UTR: <span className="font-mono text-sm font-medium text-foreground">{order.upiReference}</span>
                    {order.upiSubmittedAt && ` · entered ${new Date(order.upiSubmittedAt).toLocaleString()}`}
                  </p>
                ) : (
                  order.paymentStatus === 'pending' && <p>Customer hasn&apos;t entered a UPI transaction ID yet.</p>
                )}
                {order.paymentVerifiedAt && <p>Verified on {new Date(order.paymentVerifiedAt).toLocaleString()}</p>}
                {order.paymentStatus === 'failed' && (
                  <p className="text-destructive">Marked as not received — the customer can enter a new UTR.</p>
                )}
              </div>
            )}
            {canReviewUpi && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-sm font-medium">Verify UPI payment</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Check your bank / UPI app for a credit of ₹{order.total}
                  {order.upiReference ? ' with this UTR' : ''} before verifying. Never go by a screenshot alone.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button onClick={handleVerifyPayment} disabled={reviewPayment.isPending}>
                    {reviewPayment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Verify payment
                  </Button>
                  {order.paymentStatus === 'pending' && (
                    <Button variant="outline" onClick={handleRejectPayment} disabled={reviewPayment.isPending}>
                      Not received
                    </Button>
                  )}
                </div>
              </div>
            )}
            {order.refundedAmount > 0 && (
              <p className="mt-2 text-sm text-sky-700">
                ₹{order.refundedAmount} refunded
                {order.refundedAt ? ` on ${new Date(order.refundedAt).toLocaleDateString()}` : ''}
              </p>
            )}
            {canRefund && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-sm font-medium">Refund via Razorpay</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Leave blank for a full refund (₹{refundable}), or enter a partial amount.
                </p>
                <div className="mt-2 flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={refundable}
                    step="0.01"
                    placeholder={`₹${refundable}`}
                    value={refundInput}
                    onChange={(e) => setRefundInput(e.target.value)}
                  />
                  <Button variant="destructive" onClick={handleRefund} disabled={refund.isPending}>
                    {refund.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Refund
                  </Button>
                </div>
              </div>
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
            <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-sm">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <MapPin className="h-4 w-4" />
                {address.location ? 'View on Google Maps' : 'Search on Google Maps'}
              </a>
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <MessageCircle className="h-4 w-4" />
                Share on WhatsApp
              </a>
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

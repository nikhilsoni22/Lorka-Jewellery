'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { OrderResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { UpiPaymentPanel } from '@/components/upi-payment-panel';
import { paymentMethodLabel, trackOrderHref } from '@/lib/order-tracking';
import { useOrderLookup } from '@/lib/use-order-lookup';

export function OrderConfirmationView({ orderNumber, phone }: { orderNumber: string; phone: string }) {
  const { fetchOrder, ready } = useOrderLookup(orderNumber, phone);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    fetchOrder()
      .then((o) => !cancelled && setOrder(o))
      .catch(() => !cancelled && setNotFound(true));
    return () => {
      cancelled = true;
    };
  }, [ready, fetchOrder]);

  if (notFound) return <OrderNotFound />;

  if (!order) {
    return (
      <main className="container py-20">
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-2xl py-16">
      <div className="text-center">
        <h1 className="text-3xl">Thank you, {order.customerName}!</h1>
        <p className="mt-3 text-muted-foreground">
          Your order <span className="font-medium text-foreground">{order.orderNumber}</span> has been placed.
          {order.paymentMethod === 'upi' && order.paymentStatus !== 'paid' && ' Complete the UPI payment below to confirm it.'}
        </p>
      </div>

      <UpiPaymentPanel order={order} onUpdated={setOrder} className="mt-8" />

      {order.hasBuildItems && (
        <div className="mt-8 rounded-xl border border-gold/30 bg-secondary/40 p-5 text-center">
          <p className="text-sm font-medium text-foreground">This order includes made-to-order item(s).</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.estimatedReadyDate
              ? `Estimated ready by ${new Date(order.estimatedReadyDate).toLocaleDateString()}.`
              : 'Our team will confirm your build timeline shortly.'}
          </p>
        </div>
      )}

      <div className="mt-10 space-y-4 rounded-xl border border-border bg-card p-6">
        {order.items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span>
              {item.name} × {item.quantity}
              {item.isBuildOrder && (
                <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
                  Build to Order
                </span>
              )}
            </span>
            <span>₹{item.subtotal}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-4 text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>₹{order.subtotal}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-sm text-emerald-700">
            <span>Coupon {order.couponCode}</span>
            <span>−₹{order.discount}</span>
          </div>
        )}
        {order.charges.map((charge) => (
          <div key={charge.name} className="flex justify-between text-sm text-muted-foreground">
            <span>{charge.name}</span>
            <span>₹{charge.amount}</span>
          </div>
        ))}
        {order.prepaidDiscount > 0 && (
          <div className="flex justify-between text-sm text-emerald-700">
            <span>Prepaid discount</span>
            <span>−₹{order.prepaidDiscount}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-4 font-serif text-lg">
          <span>Total</span>
          <span>₹{order.total}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Payment: {paymentMethodLabel(order)}
          {order.razorpayPaymentId && ` (${order.razorpayPaymentId})`}
        </p>
        {order.giftWrap && (
          <p className="text-sm text-muted-foreground">
            🎁 Gift wrapped{order.giftMessage ? ` — “${order.giftMessage}”` : ''}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Shipping to: {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
          {order.shippingAddress.postalCode}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={trackOrderHref(order)}>
          <Button>Track Your Order</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Continue Shopping</Button>
        </Link>
      </div>
    </main>
  );
}

export function OrderNotFound() {
  return (
    <main className="container py-20 text-center">
      <h1 className="text-3xl">Order not found</h1>
      <p className="mt-3 text-muted-foreground">We couldn&apos;t find an order matching that link.</p>
      <Link href="/" className="mt-6 inline-block">
        <Button>Back to Home</Button>
      </Link>
    </main>
  );
}

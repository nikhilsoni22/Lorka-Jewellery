import Link from 'next/link';
import type { OrderResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; phone?: string }>;
}) {
  const { orderNumber, phone } = await searchParams;

  const order =
    orderNumber && phone
      ? await apiGet<OrderResponse>(
          `/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`,
          0,
        ).catch(() => null)
      : null;

  if (!order) {
    return (
      <main className="container py-20 text-center">
        <h1 className="text-3xl">Order not found</h1>
        <p className="mt-3 text-muted-foreground">
          We couldn&apos;t find an order matching that link.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button>Back to Home</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="container max-w-2xl py-16">
      <div className="text-center">
        <h1 className="text-3xl">Thank you, {order.customerName}!</h1>
        <p className="mt-3 text-muted-foreground">
          Your order <span className="font-medium text-foreground">{order.orderNumber}</span> has been placed.
        </p>
      </div>

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
        {order.charges.map((charge) => (
          <div key={charge.name} className="flex justify-between text-sm text-muted-foreground">
            <span>{charge.name}</span>
            <span>₹{charge.amount}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-4 font-serif text-lg">
          <span>Total</span>
          <span>₹{order.total}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Payment:{' '}
          {order.paymentMethod === 'razorpay'
            ? `Paid online${order.razorpayPaymentId ? ` (${order.razorpayPaymentId})` : ''}`
            : 'Cash on Delivery'}
        </p>
        <p className="text-sm text-muted-foreground">
          Shipping to: {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
          {order.shippingAddress.postalCode}
        </p>
      </div>

      <div className="mt-8 text-center">
        <Link href="/">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    </main>
  );
}

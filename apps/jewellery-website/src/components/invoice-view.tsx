'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import type { OrderResponse, SettingsResponse } from '@lorka/types';
import { apiClient } from '@/lib/api-client';
import { useOrderLookup } from '@/lib/use-order-lookup';
import { trackOrderHref } from '@/lib/order-tracking';
import { EMPTY_STORE_INFO, normalizeSettings } from '@/lib/store-defaults';
import { OrderNotFound } from '@/components/order-confirmation-view';

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Printable invoice — "Download" uses the browser's Save as PDF. */
export function InvoiceView({ orderNumber, phone }: { orderNumber: string; phone: string }) {
  const { fetchOrder, ready } = useOrderLookup(orderNumber, phone);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [store, setStore] = useState(EMPTY_STORE_INFO);

  useEffect(() => {
    apiClient
      .get<SettingsResponse>('/settings')
      .then((s) => setStore(normalizeSettings(s).storeInfo))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!ready) return;
    fetchOrder()
      .then(setOrder)
      .catch(() => setNotFound(true));
  }, [ready, fetchOrder]);

  if (notFound) return <OrderNotFound />;
  if (!order) {
    return (
      <main className="container flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const addr = order.shippingAddress;
  return (
    <main className="container max-w-3xl py-10 print:max-w-none print:p-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={trackOrderHref(order)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold">
          <ArrowLeft className="h-4 w-4" /> Back to order
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-background"
        >
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      <article className="rounded-xl border border-border bg-white p-8 text-[#1a1a1a] shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-6">
          <div>
            <p className="font-serif text-2xl tracking-[0.2em]">LORKA JEWELLERS</p>
            {store.address && <p className="mt-2 whitespace-pre-line text-xs text-neutral-600">{store.address}</p>}
            <p className="mt-1 text-xs text-neutral-600">
              {[store.phone, store.email].filter(Boolean).join(' · ')}
            </p>
            {store.gstin && <p className="mt-1 text-xs text-neutral-600">GSTIN: {store.gstin}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Invoice</p>
            <p className="mt-1 font-medium">{order.orderNumber}</p>
            <p className="mt-1 text-xs text-neutral-600">
              {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </header>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500">Billed & shipped to</p>
            <p className="mt-2 font-medium">{order.customerName}</p>
            <p className="text-sm text-neutral-700">
              {addr.line1}
              {addr.line2 ? `, ${addr.line2}` : ''}
              <br />
              {addr.city}, {addr.state} {addr.postalCode}
              <br />
              {addr.country}
            </p>
            <p className="mt-1 text-sm text-neutral-700">{order.customerPhone}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs uppercase tracking-wider text-neutral-500">Payment</p>
            <p className="mt-2 text-sm">{order.paymentMethod === 'razorpay' ? 'Paid online (Razorpay)' : 'Cash on Delivery'}</p>
            <p className="text-sm capitalize text-neutral-700">Status: {order.paymentStatus}</p>
            {order.razorpayPaymentId && <p className="text-xs text-neutral-500">Ref: {order.razorpayPaymentId}</p>}
          </div>
        </section>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={`${item.productId}-${item.isBuildOrder}`} className="border-b border-neutral-100">
                <td className="py-3">
                  {item.name}
                  {item.isBuildOrder && <span className="ml-2 text-xs text-neutral-500">(made to order)</span>}
                </td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3 text-right">{inr(item.unitPrice)}</td>
                <td className="py-3 text-right">{inr(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
          <Row label="Subtotal" value={inr(order.subtotal)} />
          {order.discount > 0 && <Row label={`Coupon ${order.couponCode ?? ''}`} value={`−${inr(order.discount)}`} />}
          {order.charges.map((c) => (
            <Row key={c.name} label={c.name} value={inr(c.amount)} />
          ))}
          <div className="flex justify-between border-t border-neutral-300 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{inr(order.total)}</dd>
          </div>
          {order.refundedAmount > 0 && <Row label="Refunded" value={`−${inr(order.refundedAmount)}`} />}
        </dl>

        <footer className="mt-10 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-500">
          Thank you for shopping with Lorka Jewellers. This is a computer-generated invoice.
        </footer>
      </article>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-neutral-700">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

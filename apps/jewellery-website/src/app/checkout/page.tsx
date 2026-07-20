'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ChargeType, type OrderResponse, type RazorpayOrderResponse, type SettingsResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { useCart, type CartItem } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', handler: () => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type PaymentMethod = 'razorpay' | 'cod';

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="container py-20">
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </main>
      }
    >
      <CheckoutForm />
    </Suspense>
  );
}

function CheckoutForm() {
  const searchParams = useSearchParams();
  const isBuyNow = searchParams.get('mode') === 'buynow';
  const cart = useCart();
  const { user, status: authStatus } = useAuth();
  const router = useRouter();

  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    notes: '',
  });

  useEffect(() => {
    if (isBuyNow) {
      const stored = sessionStorage.getItem('lorka:buy-now-item');
      if (stored) setBuyNowItem(JSON.parse(stored));
    }
    setReady(true);
  }, [isBuyNow]);

  useEffect(() => {
    apiClient
      .get<SettingsResponse>('/settings')
      .then(setSettings)
      .catch(() => setSettings({ charges: [], maintenance: { enabled: false, message: '' } }));
  }, []);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      const redirect = isBuyNow ? '/checkout?mode=buynow' : '/checkout';
      router.replace(`/account/login?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [authStatus, isBuyNow, router]);

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      customerName: f.customerName || user.name,
      customerEmail: f.customerEmail || user.email,
    }));
  }, [user]);

  const items = isBuyNow ? (buyNowItem ? [buyNowItem] : []) : cart.items;
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const hasBuildItems = items.some((i) => i.isBuildOrder);

  const charges = (settings?.charges ?? [])
    .filter((c) => c.isActive)
    .map((c) => ({
      name: c.name,
      amount:
        Math.round((c.type === ChargeType.Percentage ? (subtotal * c.value) / 100 : c.value) * 100) / 100,
    }));
  const total = subtotal + charges.reduce((sum, c) => sum + c.amount, 0);

  const updateField = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const orderItemsPayload = () =>
    items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      isBuildOrder: i.isBuildOrder ?? false,
    }));

  const placeOrder = async (paymentFields: {
    paymentMethod: PaymentMethod;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  }) => {
    const order = await apiClient.post<OrderResponse>('/orders', {
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail || undefined,
      shippingAddress: {
        line1: form.line1,
        line2: form.line2 || undefined,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: form.country,
      },
      items: orderItemsPayload(),
      notes: form.notes || undefined,
      ...paymentFields,
    });

    if (isBuyNow) {
      sessionStorage.removeItem('lorka:buy-now-item');
    } else {
      cart.clear();
    }

    router.push(
      `/order-confirmation?orderNumber=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(form.customerPhone)}`,
    );
  };

  const payWithRazorpay = async () => {
    if (typeof window === 'undefined' || !window.Razorpay) {
      throw new Error('Payment gateway is still loading. Please try again in a moment.');
    }

    const rpOrder = await apiClient.post<RazorpayOrderResponse>('/payments/razorpay/order', {
      items: orderItemsPayload(),
    });

    await new Promise<void>((resolve, reject) => {
      const razorpay = new window.Razorpay!({
        key: rpOrder.keyId,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        order_id: rpOrder.razorpayOrderId,
        name: 'Lorka Jewellers',
        description: 'Order payment',
        prefill: {
          name: form.customerName || undefined,
          email: form.customerEmail || undefined,
          contact: form.customerPhone || undefined,
        },
        theme: { color: '#141414' },
        handler: (response) => {
          placeOrder({
            paymentMethod: 'razorpay',
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then(resolve)
            .catch(reject);
        },
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled.')),
        },
      });
      razorpay.on('payment.failed', () => reject(new Error('Payment failed. Please try again.')));
      razorpay.open();
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setSubmitting(true);
    try {
      if (paymentMethod === 'razorpay') {
        await payWithRazorpay();
      } else {
        await placeOrder({ paymentMethod: 'cod' });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || authStatus === 'loading' || authStatus === 'unauthenticated') {
    return (
      <main className="container py-20">
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="container py-20 text-center">
        <h1 className="text-3xl">Nothing to check out</h1>
        <p className="mt-3 text-muted-foreground">Your cart is empty.</p>
      </main>
    );
  }

  return (
    <main className="container py-12">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <h1 className="text-3xl">Checkout</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="space-y-5 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Full name</label>
              <input
                required
                value={form.customerName}
                onChange={updateField('customerName')}
                className={cn(inputClass, 'mt-1')}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input
                required
                value={form.customerPhone}
                onChange={updateField('customerPhone')}
                className={cn(inputClass, 'mt-1')}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email (optional)</label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={updateField('customerEmail')}
                className={cn(inputClass, 'mt-1')}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Address line 1</label>
              <input
                required
                value={form.line1}
                onChange={updateField('line1')}
                className={cn(inputClass, 'mt-1')}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Address line 2 (optional)</label>
              <input value={form.line2} onChange={updateField('line2')} className={cn(inputClass, 'mt-1')} />
            </div>
            <div>
              <label className="text-sm font-medium">City</label>
              <input
                required
                value={form.city}
                onChange={updateField('city')}
                className={cn(inputClass, 'mt-1')}
              />
            </div>
            <div>
              <label className="text-sm font-medium">State</label>
              <input
                required
                value={form.state}
                onChange={updateField('state')}
                className={cn(inputClass, 'mt-1')}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Postal code</label>
              <input
                required
                value={form.postalCode}
                onChange={updateField('postalCode')}
                className={cn(inputClass, 'mt-1')}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Country</label>
              <input
                required
                value={form.country}
                onChange={updateField('country')}
                className={cn(inputClass, 'mt-1')}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Order notes (optional)</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={updateField('notes')}
              className={cn(inputClass, 'mt-1')}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Payment Method</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <label
                className={cn(
                  'flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-4 py-3 text-sm transition-colors',
                  paymentMethod === 'razorpay' ? 'border-gold bg-secondary/50' : 'border-border',
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  className="accent-gold"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                />
                Pay Online (Card / UPI / Netbanking)
              </label>
              <label
                className={cn(
                  'flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-4 py-3 text-sm transition-colors',
                  paymentMethod === 'cod' ? 'border-gold bg-secondary/50' : 'border-border',
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  className="accent-gold"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                Cash on Delivery
              </label>
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting
              ? paymentMethod === 'razorpay'
                ? 'Processing payment…'
                : 'Placing order…'
              : paymentMethod === 'razorpay'
                ? 'Pay & Place Order'
                : 'Place Order'}
          </Button>
        </form>

        <div className="space-y-4 rounded-xl border border-border bg-card p-5 h-fit">
          <h2 className="text-lg">Order Summary</h2>
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span>
                {item.name} × {item.quantity}
                {item.isBuildOrder && (
                  <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
                    Build to Order
                  </span>
                )}
              </span>
              <span>₹{item.unitPrice * item.quantity}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-3 text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          {charges.map((charge) => (
            <div key={charge.name} className="flex justify-between text-sm text-muted-foreground">
              <span>{charge.name}</span>
              <span>₹{charge.amount}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-3 font-serif text-lg">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
          {hasBuildItems && (
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              This order includes made-to-order item(s). Our team will confirm your build timeline after
              placing the order.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

'use client';

import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { toast } from 'sonner';
import { Crosshair, Gift, Loader2, Lock, ShieldCheck, Tag, Truck, X } from 'lucide-react';
import {
  ALLOWED_ORDER_CITIES,
  ChargeType,
  type CouponValidationResponse,
  type OrderResponse,
  type RazorpayOrderResponse,
  type SettingsResponse,
} from '@lorka/types';
import { Button } from '@/components/ui/button';
import { useCart, type CartItem } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { FALLBACK_SETTINGS } from '@/lib/store-defaults';

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const isAllowedCity = (city: string) =>
  ALLOWED_ORDER_CITIES.some((c) => c.toLowerCase() === city.trim().toLowerCase());

const cityRestrictionMessage = `We currently deliver only within ${ALLOWED_ORDER_CITIES.join(' and ')}. Support for other cities is coming soon.`;

interface GoogleMapsEventListener {
  remove: () => void;
}

interface GoogleAddressComponent {
  long_name: string;
  types: string[];
}

interface GooglePlaceResult {
  address_components?: GoogleAddressComponent[];
  geometry?: { location?: { lat: () => number; lng: () => number } };
  formatted_address?: string;
}

interface GoogleGeocoder {
  geocode: (
    request: { location: { lat: number; lng: number } },
    callback: (results: GooglePlaceResult[] | null, status: string) => void,
  ) => void;
}

interface GoogleAutocompleteInstance {
  addListener: (event: 'place_changed', handler: () => void) => GoogleMapsEventListener;
  getPlace: () => GooglePlaceResult;
}

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
    google?: {
      maps: {
        Geocoder: new () => GoogleGeocoder;
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: Record<string, unknown>,
          ) => GoogleAutocompleteInstance;
        };
      };
    };
  }
}

type PaymentMethod = 'razorpay' | 'cod' | 'upi';

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
  const onlineEnabled = settings?.paymentMethods?.onlineEnabled ?? true;
  const codEnabled = settings?.paymentMethods?.codEnabled ?? true;
  const upiEnabled = Boolean(settings?.paymentMethods?.upiEnabled && settings.paymentMethods.upiId);
  const noPaymentMethod = !onlineEnabled && !codEnabled && !upiEnabled;
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
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const line1Ref = useRef<HTMLInputElement>(null);

  const cityAllowed = form.city.trim() === '' || isAllowedCity(form.city);

  // Fills the address fields from a Google place/geocode result and remembers its coordinates.
  // Shared by autocomplete selection and "use my current location".
  const applyPlace = useCallback((place: GooglePlaceResult, lat: number, lng: number) => {
    const component = (type: string) =>
      place.address_components?.find((c) => c.types.includes(type))?.long_name ?? '';
    const street = [component('street_number'), component('route')].filter(Boolean).join(' ');
    const city = component('locality') || component('postal_town') || component('administrative_area_level_2');

    setForm((f) => ({
      ...f,
      line1: street || place.formatted_address || f.line1,
      city: city || f.city,
      state: component('administrative_area_level_1') || f.state,
      postalCode: component('postal_code') || f.postalCode,
      country: component('country') || f.country,
    }));
    setLocation({ lat, lng });
  }, []);

  const detectCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Location detection is not supported by your browser.');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        if (!window.google) {
          setLocation({ lat, lng });
          setDetecting(false);
          toast.error('Could not look up the address. Please type it in.');
          return;
        }
        new window.google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
          setDetecting(false);
          const best = status === 'OK' ? results?.[0] : undefined;
          if (!best) {
            // Keep the pin so delivery can still navigate to it, but the address needs typing.
            setLocation({ lat, lng });
            toast.error('Found your location but could not read the address. Please type it in.');
            return;
          }
          applyPlace(best, lat, lng);
          toast.success('Address filled from your current location. Please check it.');
        });
      },
      (err) => {
        setDetecting(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Please allow location access or type your address.'
            : 'Unable to detect your location. Please type your address.',
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    if (!mapsLoaded || !line1Ref.current || typeof window === 'undefined' || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(line1Ref.current, {
      fields: ['address_components', 'geometry', 'formatted_address'],
      componentRestrictions: { country: 'in' },
      types: ['address'],
    });

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const loc = place.geometry?.location;
      if (!place.address_components || !loc) {
        setLocation(null);
        return;
      }
      applyPlace(place, loc.lat(), loc.lng());
    });

    return () => listener.remove();
  }, [mapsLoaded, applyPlace]);

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
      .catch(() => setSettings(FALLBACK_SETTINGS));
  }, []);

  // Keep the selection on a method the admin hasn't disabled.
  useEffect(() => {
    const enabled: Record<PaymentMethod, boolean> = { razorpay: onlineEnabled, upi: upiEnabled, cod: codEnabled };
    if (enabled[paymentMethod]) return;
    const fallback = (['razorpay', 'upi', 'cod'] as const).find((m) => enabled[m]);
    if (fallback) setPaymentMethod(fallback);
  }, [paymentMethod, onlineEnabled, codEnabled, upiEnabled]);

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
  const subtotal = Math.round(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) * 100) / 100;
  const hasBuildItems = items.some((i) => i.isBuildOrder);

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponValidationResponse | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');

  const applyCoupon = async (code: string, silent = false) => {
    if (!code.trim()) return;
    setApplyingCoupon(true);
    try {
      const result = await apiClient.post<CouponValidationResponse>('/coupons/validate', { code: code.trim(), subtotal });
      setCoupon(result);
      if (!silent) toast.success(`Coupon applied — you save ₹${result.discount}`);
    } catch (err) {
      setCoupon(null);
      toast.error(err instanceof Error ? err.message : 'This coupon could not be applied');
    } finally {
      setApplyingCoupon(false);
    }
  };

  // The discount depends on the subtotal, so re-check the coupon whenever the cart changes.
  const appliedCode = coupon?.code;
  useEffect(() => {
    if (appliedCode) void applyCoupon(appliedCode, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const discount = coupon?.discount ?? 0;
  // Same maths as the API: charges apply to the subtotal after the coupon discount.
  const chargeBase = subtotal - discount;
  const charges = (settings?.charges ?? [])
    .filter((c) => c.isActive)
    .map((c) => ({
      name: c.name,
      amount:
        Math.round((c.type === ChargeType.Percentage ? (chargeBase * c.value) / 100 : c.value) * 100) / 100,
    }));
  const total = Math.round((chargeBase + charges.reduce((sum, c) => sum + c.amount, 0)) * 100) / 100;

  const updateField = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    // Coordinates were captured for a specific autocomplete selection; once the address is
    // hand-edited they no longer necessarily match, so drop them rather than keep stale data.
    if (field === 'line1') setLocation(null);
  };

  const orderItemsPayload = () =>
    items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      isBuildOrder: i.isBuildOrder ?? false,
    }));

  /** Everything the customer entered — sent both when starting a payment and when placing the order. */
  const checkoutDetails = () => ({
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
      location,
    },
    items: orderItemsPayload(),
    notes: form.notes || undefined,
    couponCode: coupon?.code,
    giftWrap,
    giftMessage: giftWrap ? giftMessage : '',
  });

  const placeOrder = async (paymentFields: {
    paymentMethod: PaymentMethod;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  }) => {
    const order = await apiClient.post<OrderResponse>('/orders', {
      ...checkoutDetails(),
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

    // Full details, not just items: if the customer closes the tab right after paying, the API's
    // payment webhook uses them to create the order anyway.
    const rpOrder = await apiClient.post<RazorpayOrderResponse>('/payments/razorpay/order', checkoutDetails());

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
    if (!isAllowedCity(form.city)) {
      toast.error(cityRestrictionMessage);
      return;
    }

    setSubmitting(true);
    try {
      if (paymentMethod === 'razorpay') {
        await payWithRazorpay();
      } else {
        // UPI orders are placed unpaid; the confirmation page then shows the QR for the exact total.
        await placeOrder({ paymentMethod });
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
      {GOOGLE_MAPS_API_KEY && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="afterInteractive"
          // onReady, not onLoad: onLoad fires only the first time the script loads, so coming back
          // to checkout in the same tab left address suggestions and "current location" dead.
          onReady={() => setMapsLoaded(true)}
        />
      )}
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
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">Address line 1</label>
                {GOOGLE_MAPS_API_KEY && (
                  <button
                    type="button"
                    onClick={detectCurrentLocation}
                    disabled={!mapsLoaded || detecting}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {detecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crosshair className="h-3 w-3" />}
                    Use my current location
                  </button>
                )}
              </div>
              <input
                required
                ref={line1Ref}
                autoComplete="off"
                placeholder="Start typing your address…"
                value={form.line1}
                onChange={updateField('line1')}
                className={cn(inputClass, 'mt-1')}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                We currently deliver only within {ALLOWED_ORDER_CITIES.join(' and ')}.
              </p>
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
                className={cn(inputClass, 'mt-1', !cityAllowed && 'border-destructive focus-visible:ring-destructive')}
              />
              {!cityAllowed && (
                <p className="mt-1 text-xs text-destructive">{cityRestrictionMessage}</p>
              )}
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

          <div
            className={cn(
              'rounded-lg border p-4 transition-colors',
              giftWrap ? 'border-gold bg-secondary/40' : 'border-border',
            )}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 accent-gold"
                checked={giftWrap}
                onChange={(e) => setGiftWrap(e.target.checked)}
              />
              <span>
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Gift className="h-4 w-4 text-gold" /> This is a gift — wrap it beautifully
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Free gift wrapping, and we&apos;ll add your handwritten-style note.
                </span>
              </span>
            </label>
            {giftWrap && (
              <div className="mt-3 animate-fade-in">
                <textarea
                  rows={2}
                  maxLength={250}
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  placeholder="Your gift message (optional)"
                  className={inputClass}
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{giftMessage.length}/250</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Payment Method</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              {onlineEnabled && (
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
              )}
              {upiEnabled && (
                <label
                  className={cn(
                    'flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-4 py-3 text-sm transition-colors',
                    paymentMethod === 'upi' ? 'border-gold bg-secondary/50' : 'border-border',
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="accent-gold"
                    checked={paymentMethod === 'upi'}
                    onChange={() => setPaymentMethod('upi')}
                  />
                  Pay by UPI (GPay / PhonePe / Paytm)
                </label>
              )}
              {codEnabled && (
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
              )}
              {noPaymentMethod && (
                <p className="text-sm text-destructive">
                  Orders are temporarily unavailable. Please try again later.
                </p>
              )}
            </div>
            {paymentMethod === 'upi' && upiEnabled && (
              <p className="mt-2 text-xs text-muted-foreground">
                After you place the order, we&apos;ll show a UPI QR code for the exact amount. Pay with any UPI app
                and enter the transaction ID — your order is confirmed once we verify the payment.
              </p>
            )}
          </div>

          <Button type="submit" disabled={submitting || !cityAllowed || noPaymentMethod} className="w-full sm:w-auto">
            {submitting
              ? paymentMethod === 'razorpay'
                ? 'Processing payment…'
                : 'Placing order…'
              : paymentMethod === 'razorpay'
                ? 'Pay & Place Order'
                : paymentMethod === 'upi'
                  ? 'Place Order & Pay by UPI'
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

          {coupon ? (
            <div className="flex items-center justify-between rounded-md border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 animate-scale-in">
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <span>
                  <span className="font-semibold">{coupon.code}</span> applied
                  {coupon.description && <span className="block text-xs">{coupon.description}</span>}
                </span>
              </span>
              <span className="flex items-center gap-2">
                −₹{coupon.discount}
                <button
                  type="button"
                  aria-label="Remove coupon"
                  onClick={() => {
                    setCoupon(null);
                    setCouponInput('');
                  }}
                  className="rounded-full p-0.5 hover:bg-emerald-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void applyCoupon(couponInput);
              }}
              className="flex gap-2"
            >
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className={cn(inputClass, 'uppercase placeholder:normal-case')}
              />
              <button
                type="submit"
                disabled={applyingCoupon || !couponInput.trim()}
                className="shrink-0 rounded-md border border-foreground px-4 text-sm font-medium transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
              >
                {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
              </button>
            </form>
          )}

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
          {discount > 0 && (
            <p className="text-right text-xs font-medium text-emerald-700">You save ₹{discount} on this order</p>
          )}
          {hasBuildItems && (
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              This order includes made-to-order item(s). Our team will confirm your build timeline after
              placing the order.
            </p>
          )}
          <ul className="space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
            {onlineEnabled && (
              <li className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-gold" /> Payments secured by Razorpay — we never see your card details
              </li>
            )}
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" /> UPI, cards, netbanking &amp; cash on delivery
            </li>
            <li className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-gold" /> Live tracking from order to delivery
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

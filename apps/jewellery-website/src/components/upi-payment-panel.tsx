'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { CircleAlert, Clock, Copy, Loader2, Smartphone } from 'lucide-react';
import type { OrderResponse, SettingsResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { normalizeSettings } from '@/lib/store-defaults';
import { cn } from '@/lib/utils';

/** The standard UPI deep link — opens any UPI app with the payee, amount and note filled in. */
function upiLink(upiId: string, payeeName: string, order: OrderResponse): string {
  const params = [
    `pa=${upiId}`,
    `pn=${encodeURIComponent(payeeName || 'Lorka Jewellers')}`,
    `am=${order.total.toFixed(2)}`,
    'cu=INR',
    `tn=${encodeURIComponent(`Order ${order.orderNumber}`)}`,
  ];
  return `upi://pay?${params.join('&')}`;
}

/**
 * Pay-by-UPI box for an unpaid UPI order: QR / app button for the exact order total, then the
 * customer enters the UTR so the store can match the payment in its bank. Renders nothing for
 * other orders, or once the payment is verified.
 */
export function UpiPaymentPanel({
  order,
  onUpdated,
  className,
}: {
  order: OrderResponse;
  onUpdated: (order: OrderResponse) => void;
  className?: string;
}) {
  const needsPayment =
    order.paymentMethod === 'upi' &&
    order.status !== 'cancelled' &&
    (order.paymentStatus === 'pending' || order.paymentStatus === 'failed');

  const [upi, setUpi] = useState<{ id: string; name: string } | null>(null);
  const [qr, setQr] = useState('');
  const [reference, setReference] = useState('');
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!needsPayment) return;
    apiClient
      .get<SettingsResponse>('/settings')
      .then((s) => {
        const { upiId, upiPayeeName } = normalizeSettings(s).paymentMethods;
        setUpi({ id: upiId, name: upiPayeeName });
      })
      .catch(() => setUpi({ id: '', name: '' }));
  }, [needsPayment]);

  const link = upi?.id ? upiLink(upi.id, upi.name, order) : '';

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(link, { width: 240, margin: 1 }))
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(''));
    return () => {
      cancelled = true;
    };
  }, [link]);

  if (!needsPayment) return null;

  const submitted = Boolean(order.upiReference) && order.paymentStatus === 'pending';
  const rejected = order.paymentStatus === 'failed';
  const showPayment = !submitted || editing;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updated = await apiClient.post<OrderResponse>('/orders/upi-payment', {
        orderNumber: order.orderNumber,
        phone: order.customerPhone,
        upiReference: reference,
      });
      onUpdated(updated);
      setEditing(false);
      setReference('');
      toast.success('Thanks! We will verify your payment and email you shortly.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the transaction ID');
    } finally {
      setSubmitting(false);
    }
  };

  const copyUpiId = () =>
    navigator.clipboard
      .writeText(upi?.id ?? '')
      .then(() => toast.success('UPI ID copied'))
      .catch(() => toast.error('Copy failed. Please select and copy it.'));

  return (
    <section className={cn('rounded-2xl border border-gold/40 bg-card p-6 shadow-sm md:p-8', className)}>
      {submitted && !editing ? (
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <div>
            <h2 className="text-xl">We&apos;re verifying your payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              UPI transaction ID <span className="font-medium text-foreground">{order.upiReference}</span> received.
              We&apos;ll confirm your order and email you as soon as we see ₹{order.total} in our account,
              usually within a few hours.
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-3 text-xs font-medium text-gold underline-offset-4 hover:underline"
            >
              Entered the wrong ID? Update it
            </button>
          </div>
        </div>
      ) : (
        <>
          <h2 className="text-xl">Complete your payment by UPI</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pay exactly <span className="font-semibold text-foreground">₹{order.total}</span> to confirm order{' '}
            {order.orderNumber}.
          </p>
          {rejected && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              We couldn&apos;t verify your last payment. If you have paid, enter the correct transaction ID below.
            </p>
          )}
        </>
      )}

      {showPayment && (
        <div className="mt-6 grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
          <div className="flex flex-col items-center gap-3">
            {upi === null || (link && !qr) ? (
              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl border border-border">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : link ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt={`UPI QR code for ₹${order.total}`}
                width={200}
                height={200}
                className="rounded-xl border border-border bg-white p-2"
              />
            ) : (
              <p className="max-w-[200px] text-center text-sm text-destructive">
                UPI details are unavailable right now. Please contact us to complete your payment.
              </p>
            )}
            {link && (
              <a href={link} className="w-full md:hidden">
                <Button type="button" className="w-full">
                  <Smartphone className="h-4 w-4" /> Pay with UPI app
                </Button>
              </a>
            )}
          </div>

          <div className="space-y-4 text-sm">
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Scan the QR with any UPI app (GPay, PhonePe, Paytm…) or tap “Pay with UPI app” on your phone.</li>
              <li>Check the amount is ₹{order.total} and pay.</li>
              <li>Copy the UPI transaction ID / UTR (12 digits) from the payment receipt and enter it below.</li>
            </ol>
            {upi?.id && (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-3 py-2">
                <span className="min-w-0">
                  <span className="block text-xs text-muted-foreground">UPI ID{upi.name ? ` · ${upi.name}` : ''}</span>
                  <span className="block truncate font-medium">{upi.id}</span>
                </span>
                <button
                  type="button"
                  onClick={copyUpiId}
                  aria-label="Copy UPI ID"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-gold"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}
            <form onSubmit={submit} className="space-y-2">
              <label className="text-sm font-medium" htmlFor="upi-reference">
                UPI transaction ID / UTR
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="upi-reference"
                  required
                  inputMode="text"
                  autoComplete="off"
                  minLength={6}
                  maxLength={35}
                  value={reference}
                  onChange={(e) => setReference(e.target.value.replace(/\s/g, '').toUpperCase())}
                  placeholder="e.g. 412345678901"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" disabled={submitting || reference.length < 6} className="shrink-0">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  I have paid
                </Button>
              </div>
              {editing && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Cancel
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

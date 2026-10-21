'use client';

import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ChargeType,
  PaymentMethod,
  paymentAdjustment,
  type PaymentPricing,
  type PoliciesResponse,
  type StoreInfoResponse,
} from '@lorka/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useSettings, useUpdateSettings } from '@/lib/hooks/settings';
import { extractMessage } from '@/lib/api-utils';

interface ChargeRow {
  id?: string;
  name: string;
  type: ChargeType;
  value: string;
  isActive: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
const WEBHOOK_URL = `${API_URL}/payments/razorpay/webhook`;
const WEBSITE_URL = (process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

const EMPTY_STORE_INFO: StoreInfoResponse = {
  phone: '',
  whatsappNumber: '',
  email: '',
  address: '',
  instagramUrl: '',
  facebookUrl: '',
  youtubeUrl: '',
  gstin: '',
};
const EMPTY_POLICIES: PoliciesResponse = { privacy: '', terms: '', refund: '', shipping: '' };
const POLICY_FIELDS: { key: keyof PoliciesResponse; label: string; path: string }[] = [
  { key: 'privacy', label: 'Privacy Policy', path: '/policies/privacy' },
  { key: 'terms', label: 'Terms & Conditions', path: '/policies/terms' },
  { key: 'refund', label: 'Refund & Cancellation', path: '/policies/refund' },
  { key: 'shipping', label: 'Shipping & Delivery', path: '/policies/shipping' },
];

/** Form state for one COD-fee / prepaid-discount rule — numbers kept as typed text. */
interface PriceRuleRow {
  type: ChargeType;
  value: string;
  maxAmount: string;
}

const EMPTY_RULE: PriceRuleRow = { type: ChargeType.Fixed, value: '0', maxAmount: '0' };
const toRuleRow = (rule?: PaymentPricing['codFee']): PriceRuleRow =>
  rule ? { type: rule.type, value: String(rule.value), maxAmount: String(rule.maxAmount) } : EMPTY_RULE;
const toRule = (row: PriceRuleRow) => ({ type: row.type, value: Number(row.value), maxAmount: Number(row.maxAmount) });
const isValidRule = (row: PriceRuleRow) =>
  Number(row.value) >= 0 &&
  Number(row.maxAmount) >= 0 &&
  !(row.type === ChargeType.Percentage && Number(row.value) > 100);

/** Example order value for the live preview under the pricing settings. */
const EXAMPLE_ORDER = 10_000;

function toDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [silverRatePerKg, setSilverRatePerKg] = useState('0');
  const [goldRatePer10g, setGoldRatePer10g] = useState('0');
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [maintenance, setMaintenance] = useState({ enabled: false, startAt: '', endAt: '', message: '' });
  const [paymentMethods, setPaymentMethods] = useState({
    onlineEnabled: true,
    codEnabled: true,
    upiEnabled: false,
    upiId: '',
    upiPayeeName: '',
    upiPaymentWindowHours: '24',
  });
  const [codFee, setCodFee] = useState<PriceRuleRow>(EMPTY_RULE);
  const [prepaidDiscount, setPrepaidDiscount] = useState<PriceRuleRow>(EMPTY_RULE);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');
  const [storeInfo, setStoreInfo] = useState<StoreInfoResponse>(EMPTY_STORE_INFO);
  const [policies, setPolicies] = useState<PoliciesResponse>(EMPTY_POLICIES);
  const updateStore = (key: keyof StoreInfoResponse) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setStoreInfo((s) => ({ ...s, [key]: e.target.value }));

  useEffect(() => {
    if (!data) return;
    setSilverRatePerKg(String(data.silverRatePerKg));
    setGoldRatePer10g(String(data.goldRatePer10g));
    setCharges(
      data.charges.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type as ChargeType,
        value: String(c.value),
        isActive: c.isActive,
      })),
    );
    setMaintenance({
      enabled: data.maintenance.enabled,
      startAt: toDatetimeLocal(data.maintenance.startAt),
      endAt: toDatetimeLocal(data.maintenance.endAt),
      message: data.maintenance.message,
    });
    setPaymentMethods({
      onlineEnabled: data.paymentMethods?.onlineEnabled ?? true,
      codEnabled: data.paymentMethods?.codEnabled ?? true,
      upiEnabled: data.paymentMethods?.upiEnabled ?? false,
      upiId: data.paymentMethods?.upiId ?? '',
      upiPayeeName: data.paymentMethods?.upiPayeeName ?? '',
      upiPaymentWindowHours: String(data.paymentMethods?.upiPaymentWindowHours ?? 24),
    });
    setCodFee(toRuleRow(data.paymentPricing?.codFee));
    setPrepaidDiscount(toRuleRow(data.paymentPricing?.prepaidDiscount));
    setNotificationEmail(data.notificationEmail ?? '');
    setRazorpayKeyId(data.razorpayKeyId ?? '');
    setRazorpayKeySecret(data.razorpayKeySecret ?? '');
    setRazorpayWebhookSecret(data.razorpayWebhookSecret ?? '');
    setStoreInfo({ ...EMPTY_STORE_INFO, ...data.storeInfo });
    setPolicies({ ...EMPTY_POLICIES, ...data.policies });
  }, [data]);

  const addCharge = () => {
    setCharges((rows) => [...rows, { name: '', type: ChargeType.Fixed, value: '0', isActive: true }]);
  };

  const updateCharge = (index: number, patch: Partial<ChargeRow>) => {
    setCharges((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeCharge = (index: number) => {
    setCharges((rows) => rows.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (Number.isNaN(Number(silverRatePerKg)) || Number(silverRatePerKg) < 0) {
      toast.error('Enter a valid silver rate');
      return;
    }
    if (Number.isNaN(Number(goldRatePer10g)) || Number(goldRatePer10g) < 0) {
      toast.error('Enter a valid gold rate');
      return;
    }
    if (charges.some((c) => !c.name.trim() || Number.isNaN(Number(c.value)))) {
      toast.error('Every charge needs a name and a numeric value');
      return;
    }
    if (maintenance.startAt && maintenance.endAt && maintenance.endAt < maintenance.startAt) {
      toast.error('Maintenance end time must be after the start time');
      return;
    }
    if (notificationEmail.trim() && !/^\S+@\S+\.\S+$/.test(notificationEmail.trim())) {
      toast.error('Enter a valid notification email');
      return;
    }

    if (storeInfo.whatsappNumber.trim() && !/^\d{10,15}$/.test(storeInfo.whatsappNumber.trim())) {
      toast.error('WhatsApp number: digits only, with country code — e.g. 919876543210');
      return;
    }

    if (!paymentMethods.onlineEnabled && !paymentMethods.codEnabled && !paymentMethods.upiEnabled) {
      toast.error('Keep at least one payment method enabled, or customers cannot place orders');
      return;
    }
    if (!isValidRule(codFee) || !isValidRule(prepaidDiscount)) {
      toast.error('COD fee / prepaid discount: enter amounts of 0 or more, and percentages up to 100');
      return;
    }
    const upiId = paymentMethods.upiId.trim();
    if (paymentMethods.upiEnabled && !upiId) {
      toast.error('Add your UPI ID to turn on UPI payments');
      return;
    }
    const upiPaymentWindowHours = Number(paymentMethods.upiPaymentWindowHours);
    if (!Number.isInteger(upiPaymentWindowHours) || upiPaymentWindowHours < 1 || upiPaymentWindowHours > 168) {
      toast.error('UPI payment time: enter whole hours between 1 and 168');
      return;
    }
    if (upiId && !/^[\w.-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/.test(upiId)) {
      toast.error('Enter a valid UPI ID — e.g. lorka@okaxis');
      return;
    }

    updateSettings.mutate(
      {
        silverRatePerKg: Number(silverRatePerKg),
        goldRatePer10g: Number(goldRatePer10g),
        charges: charges.map((c) => ({
          id: c.id,
          name: c.name.trim(),
          type: c.type,
          value: Number(c.value),
          isActive: c.isActive,
        })),
        maintenance: {
          enabled: maintenance.enabled,
          startAt: maintenance.startAt ? new Date(maintenance.startAt) : undefined,
          endAt: maintenance.endAt ? new Date(maintenance.endAt) : undefined,
          message: maintenance.message,
        },
        paymentMethods: {
          ...paymentMethods,
          upiId,
          upiPayeeName: paymentMethods.upiPayeeName.trim(),
          upiPaymentWindowHours,
        },
        paymentPricing: { codFee: toRule(codFee), prepaidDiscount: toRule(prepaidDiscount) },
        notificationEmail: notificationEmail.trim() || undefined,
        razorpayKeyId: razorpayKeyId.trim() || undefined,
        razorpayKeySecret: razorpayKeySecret.trim() || undefined,
        razorpayWebhookSecret: razorpayWebhookSecret.trim() || undefined,
        storeInfo: Object.fromEntries(
          Object.entries(storeInfo).map(([k, v]) => [k, v.trim()]),
        ) as unknown as StoreInfoResponse,
        policies,
      },
      {
        onSuccess: () => toast.success('Settings saved'),
        onError: (err) => toast.error(extractMessage(err, 'Unable to save settings')),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Metal rates, charges, payments, store details, policies and maintenance mode.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Metal Rates</CardTitle>
          <CardDescription>
            Set today&apos;s rate for each metal — silver per kg, gold per 10 grams (standard
            convention). Every product&apos;s price is calculated live as (weight in grams × rate) +
            its making charge — changing the rate here instantly updates every product of that
            metal, no need to edit them individually.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Silver rate (₹ per kg)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={silverRatePerKg}
              onChange={(e) => setSilverRatePerKg(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Gold rate (₹ per 10 grams)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={goldRatePer10g}
              onChange={(e) => setGoldRatePer10g(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Extra Charges</CardTitle>
          <CardDescription>
            Shipping, surge, or any other charge added on top of the product price at checkout. Inactive
            charges are kept but not applied.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {charges.length === 0 && (
            <p className="text-sm text-muted-foreground">No extra charges configured yet.</p>
          )}
          {charges.map((charge, index) => (
            <div
              key={charge.id ?? index}
              className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_auto_auto] sm:items-end"
            >
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={charge.name}
                  onChange={(e) => updateCharge(index, { name: e.target.value })}
                  placeholder="Shipping / Surge / Rain surcharge"
                />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={charge.type}
                  onChange={(e) => updateCharge(index, { type: e.target.value as ChargeType })}
                >
                  <option value={ChargeType.Fixed}>Fixed (₹)</option>
                  <option value={ChargeType.Percentage}>Percentage (%)</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Value</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={charge.value}
                  onChange={(e) => updateCharge(index, { value: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={charge.isActive}
                  onChange={(e) => updateCharge(index, { isActive: e.target.checked })}
                />
                Active
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => removeCharge(index)}
                aria-label="Remove charge"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addCharge}>
            <Plus className="h-4 w-4" />
            Add charge
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Maintenance Break</CardTitle>
          <CardDescription>
            While enabled, the storefront shows a maintenance page to every visitor for the selected window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={maintenance.enabled}
              onChange={(e) => setMaintenance((m) => ({ ...m, enabled: e.target.checked }))}
            />
            Put the website into maintenance mode
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Starts at (optional)</Label>
              <Input
                type="datetime-local"
                value={maintenance.startAt}
                onChange={(e) => setMaintenance((m) => ({ ...m, startAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Ends at (optional)</Label>
              <Input
                type="datetime-local"
                value={maintenance.endAt}
                onChange={(e) => setMaintenance((m) => ({ ...m, endAt: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave both blank to apply immediately with no end time (until turned off).
          </p>
          <div className="space-y-1">
            <Label>Message shown to visitors (optional)</Label>
            <Textarea
              rows={3}
              value={maintenance.message}
              onChange={(e) => setMaintenance((m) => ({ ...m, message: e.target.value }))}
              placeholder="We'll be back shortly — thanks for your patience."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Payment Methods</CardTitle>
          <CardDescription>
            Choose which payment options customers see at checkout. A disabled method is hidden on the
            website and also rejected by the server. At least one must stay enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={paymentMethods.onlineEnabled}
              onChange={(e) => setPaymentMethods((m) => ({ ...m, onlineEnabled: e.target.checked }))}
            />
            Online payment (Razorpay — card / UPI / netbanking)
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={paymentMethods.codEnabled}
              onChange={(e) => setPaymentMethods((m) => ({ ...m, codEnabled: e.target.checked }))}
            />
            Cash on Delivery
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={paymentMethods.upiEnabled}
              onChange={(e) => setPaymentMethods((m) => ({ ...m, upiEnabled: e.target.checked }))}
            />
            UPI to your own UPI ID (no gateway — you verify each payment by hand)
          </label>
          {paymentMethods.upiEnabled && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">
                After placing the order the customer sees a QR code for the exact amount, pays from any UPI app
                and enters the transaction ID (UTR). You get an email; check the credit in your bank / UPI app, then
                open the order and click <strong>Verify payment</strong> — the customer is emailed automatically.
                A business / merchant UPI ID (PhonePe Business, Paytm Business, BharatPe…) works best.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>UPI ID</Label>
                  <Input
                    value={paymentMethods.upiId}
                    onChange={(e) => setPaymentMethods((m) => ({ ...m, upiId: e.target.value }))}
                    placeholder="lorka@okaxis"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Payee name</Label>
                  <Input
                    value={paymentMethods.upiPayeeName}
                    onChange={(e) => setPaymentMethods((m) => ({ ...m, upiPayeeName: e.target.value }))}
                    placeholder="Name on the bank account"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Time to pay (hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="168"
                    step="1"
                    value={paymentMethods.upiPaymentWindowHours}
                    onChange={(e) => setPaymentMethods((m) => ({ ...m, upiPaymentWindowHours: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Orders with no transaction ID entered by then are cancelled automatically and their stock is
                    released. Orders with a transaction ID are never auto-cancelled — you review those.
                  </p>
                </div>
              </div>
              {!notificationEmail.trim() && (
                <p className="text-xs text-destructive">
                  Set a notification email below so you get an email every time a customer enters a UPI
                  transaction ID.
                </p>
              )}
            </div>
          )}
          {paymentMethods.onlineEnabled && !razorpayKeyId.trim() && (
            <p className="text-xs text-destructive">
              Online payment is enabled but no Razorpay keys are set below, so it will fail at checkout.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">COD &amp; Prepaid Pricing</CardTitle>
          <CardDescription>
            Charge a little more for Cash on Delivery and/or give a discount for paying up front (online or
            UPI) — customers see the price of each option at checkout. Worked out on the cart value after
            coupons. Set a value to 0 to turn it off.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PriceRuleFields
            title="Extra charge for Cash on Delivery"
            row={codFee}
            onChange={setCodFee}
          />
          <PriceRuleFields
            title="Discount for prepaid orders (online / UPI)"
            row={prepaidDiscount}
            onChange={setPrepaidDiscount}
          />
          {(() => {
            const pricing = { codFee: toRule(codFee), prepaidDiscount: toRule(prepaidDiscount) };
            const cod = paymentAdjustment(PaymentMethod.Cod, EXAMPLE_ORDER, pricing).codFee;
            const prepaid = paymentAdjustment(PaymentMethod.Upi, EXAMPLE_ORDER, pricing).prepaidDiscount;
            if (!cod && !prepaid) return null;
            return (
              <p className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Example — a ₹{EXAMPLE_ORDER.toLocaleString('en-IN')} cart: Cash on Delivery{' '}
                <strong className="text-foreground">₹{(EXAMPLE_ORDER + cod).toLocaleString('en-IN')}</strong>, paid
                online / UPI <strong className="text-foreground">₹{(EXAMPLE_ORDER - prepaid).toLocaleString('en-IN')}</strong>{' '}
                (plus any extra charges above).
              </p>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Payment Gateway (Razorpay)</CardTitle>
          <CardDescription>
            Get these from your{' '}
            <a
              href="https://dashboard.razorpay.com/app/keys"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Razorpay dashboard
            </a>
            . Leave both blank to disable online payments (customers can still pay COD, if
            enabled). The Key Secret is never shown to anyone but an admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Key ID</Label>
            <Input
              value={razorpayKeyId}
              onChange={(e) => setRazorpayKeyId(e.target.value)}
              placeholder="rzp_live_xxxxxxxxxxxx"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label>Key Secret</Label>
            <Input
              type="password"
              value={razorpayKeySecret}
              onChange={(e) => setRazorpayKeySecret(e.target.value)}
              placeholder="Enter to set or replace"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4 sm:col-span-2">
            <p className="text-sm font-medium">Webhook (recommended)</p>
            <p className="text-xs text-muted-foreground">
              Makes sure every successful payment becomes an order, even if the customer closes the page right
              after paying. In Razorpay Dashboard → Account &amp; Settings → Webhooks → Add New Webhook: paste
              this URL, tick the <strong>payment.captured</strong> event, choose a secret, and enter the same
              secret below.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigator.clipboard
                    .writeText(WEBHOOK_URL)
                    .then(() => toast.success('Webhook URL copied'))
                    .catch(() => toast.error('Copy failed — select and copy it manually'))
                }
              >
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
            <div className="max-w-sm space-y-1 pt-1">
              <Label>Webhook secret</Label>
              <Input
                type="password"
                value={razorpayWebhookSecret}
                onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                placeholder="Same secret as in Razorpay"
                autoComplete="off"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Store Contact Details</CardTitle>
          <CardDescription>
            Shown in the website footer, Contact page and invoices. The WhatsApp number also turns on the
            floating chat button and &ldquo;Ask on WhatsApp&rdquo; on product pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={storeInfo.phone} onChange={updateStore('phone')} placeholder="+91 98765 43210" />
          </div>
          <div className="space-y-1">
            <Label>WhatsApp number</Label>
            <Input value={storeInfo.whatsappNumber} onChange={updateStore('whatsappNumber')} placeholder="919876543210" />
            <p className="text-xs text-muted-foreground">Digits only, starting with country code 91.</p>
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={storeInfo.email} onChange={updateStore('email')} placeholder="hello@lorka.in" />
          </div>
          <div className="space-y-1">
            <Label>GSTIN (optional)</Label>
            <Input value={storeInfo.gstin} onChange={updateStore('gstin')} placeholder="Shown on invoices" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Address</Label>
            <Textarea rows={2} value={storeInfo.address} onChange={updateStore('address')} placeholder="Shop address" />
          </div>
          <div className="space-y-1">
            <Label>Instagram link</Label>
            <Input value={storeInfo.instagramUrl} onChange={updateStore('instagramUrl')} placeholder="https://instagram.com/…" />
          </div>
          <div className="space-y-1">
            <Label>Facebook link</Label>
            <Input value={storeInfo.facebookUrl} onChange={updateStore('facebookUrl')} placeholder="https://facebook.com/…" />
          </div>
          <div className="space-y-1">
            <Label>YouTube link</Label>
            <Input value={storeInfo.youtubeUrl} onChange={updateStore('youtubeUrl')} placeholder="https://youtube.com/…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Policy Pages</CardTitle>
          <CardDescription>
            Razorpay needs these pages on your website before activating live payments. Leave a box empty to
            show the default draft — but please read the drafts on the website and replace them with your
            actual policies. Formatting: blank line = new paragraph, &ldquo;## &rdquo; = heading, &ldquo;- &rdquo; = bullet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {POLICY_FIELDS.map(({ key, label, path }) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>{label}</Label>
                <a
                  href={`${WEBSITE_URL}${path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  View on website <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Textarea
                rows={5}
                value={policies[key]}
                onChange={(e) => setPolicies((p) => ({ ...p, [key]: e.target.value }))}
                placeholder="Empty — the website shows its default draft"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Order &amp; Ticket Notifications</CardTitle>
          <CardDescription>
            Get an email at this address every time a customer places a new order (with the order name/ID
            and full bill) or raises a support ticket (with their message, name, phone and address).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-1">
            <Label>Notification email</Label>
            <Input
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="orders@lorka.com"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function PriceRuleFields({
  title,
  row,
  onChange,
}: {
  title: string;
  row: PriceRuleRow;
  onChange: (row: PriceRuleRow) => void;
}) {
  const percentage = row.type === ChargeType.Percentage;
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={row.type} onChange={(e) => onChange({ ...row, type: e.target.value as ChargeType })}>
            <option value={ChargeType.Fixed}>Fixed (₹)</option>
            <option value={ChargeType.Percentage}>Percentage (%)</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{percentage ? 'Percent' : 'Amount (₹)'}</Label>
          <Input
            type="number"
            min="0"
            max={percentage ? 100 : undefined}
            step="0.01"
            value={row.value}
            onChange={(e) => onChange({ ...row, value: e.target.value })}
          />
        </div>
        {percentage && (
          <div className="space-y-1">
            <Label>Maximum (₹, 0 = no limit)</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={row.maxAmount}
              onChange={(e) => onChange({ ...row, maxAmount: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

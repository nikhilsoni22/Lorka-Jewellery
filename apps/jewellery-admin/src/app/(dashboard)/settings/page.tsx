'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ChargeType } from '@lorka/types';
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
  const [notificationEmail, setNotificationEmail] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');

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
    setNotificationEmail(data.notificationEmail ?? '');
    setRazorpayKeyId(data.razorpayKeyId ?? '');
    setRazorpayKeySecret(data.razorpayKeySecret ?? '');
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
        notificationEmail: notificationEmail.trim() || undefined,
        razorpayKeyId: razorpayKeyId.trim() || undefined,
        razorpayKeySecret: razorpayKeySecret.trim() || undefined,
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
        <p className="mt-1 text-muted-foreground">Extra charges and site-wide maintenance mode.</p>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Order Notifications</CardTitle>
          <CardDescription>
            Get an email at this address every time a customer places a new order, with the order name/ID
            and full bill.
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

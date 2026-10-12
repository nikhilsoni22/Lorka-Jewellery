'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CouponType, type CouponResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSaveCoupon } from '@/lib/hooks/coupons';
import { extractMessage } from '@/lib/api-utils';

interface FormState {
  code: string;
  description: string;
  type: CouponType;
  value: string;
  minOrderAmount: string;
  maxDiscount: string;
  usageLimit: string;
  expiresAt: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  code: '',
  description: '',
  type: CouponType.Percentage,
  value: '',
  minOrderAmount: '',
  maxDiscount: '',
  usageLimit: '',
  expiresAt: '',
  isActive: true,
};

function fromCoupon(c: CouponResponse): FormState {
  return {
    code: c.code,
    description: c.description,
    type: c.type,
    value: String(c.value),
    minOrderAmount: c.minOrderAmount ? String(c.minOrderAmount) : '',
    maxDiscount: c.maxDiscount !== null ? String(c.maxDiscount) : '',
    usageLimit: c.usageLimit !== null ? String(c.usageLimit) : '',
    expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
    isActive: c.isActive,
  };
}

export function CouponFormDialog({
  open,
  onOpenChange,
  coupon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon?: CouponResponse;
}) {
  const save = useSaveCoupon(coupon?.id);
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (open) setForm(coupon ? fromCoupon(coupon) : EMPTY);
  }, [open, coupon]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const num = (v: string) => (v.trim() === '' ? null : Number(v));
    save.mutate(
      {
        code: form.code,
        description: form.description,
        type: form.type,
        value: Number(form.value),
        minOrderAmount: num(form.minOrderAmount) ?? 0,
        maxDiscount: form.type === CouponType.Percentage ? num(form.maxDiscount) : null,
        usageLimit: num(form.usageLimit),
        // End of the chosen day, so a coupon "until 31 Oct" works all of 31 Oct.
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
        isActive: form.isActive,
      },
      {
        onSuccess: () => {
          toast.success(coupon ? 'Coupon updated' : 'Coupon created');
          onOpenChange(false);
        },
        onError: (err) => toast.error(extractMessage(err, 'Unable to save coupon')),
      },
    );
  };

  const isPercent = form.type === CouponType.Percentage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{coupon ? 'Edit Coupon' : 'New Coupon'}</DialogTitle>
          <DialogDescription>Customers enter the code at checkout to get the discount.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Code</Label>
              <Input
                id="coupon-code"
                required
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="DIWALI10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-type">Type</Label>
              <Select id="coupon-type" value={form.type} onChange={(e) => set('type', e.target.value as CouponType)}>
                <option value={CouponType.Percentage}>% off</option>
                <option value={CouponType.Flat}>₹ off (flat)</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon-desc">Description (shown to customer)</Label>
            <Input
              id="coupon-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="10% off for Diwali"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-value">{isPercent ? 'Percent off' : 'Rupees off'}</Label>
              <Input
                id="coupon-value"
                type="number"
                required
                min={1}
                max={isPercent ? 100 : undefined}
                step="0.01"
                value={form.value}
                onChange={(e) => set('value', e.target.value)}
              />
            </div>
            {isPercent && (
              <div className="space-y-2">
                <Label htmlFor="coupon-max">Max discount ₹ (optional)</Label>
                <Input
                  id="coupon-max"
                  type="number"
                  min={0}
                  value={form.maxDiscount}
                  onChange={(e) => set('maxDiscount', e.target.value)}
                  placeholder="No cap"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-min">Minimum order ₹</Label>
              <Input
                id="coupon-min"
                type="number"
                min={0}
                value={form.minOrderAmount}
                onChange={(e) => set('minOrderAmount', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-limit">Total uses allowed</Label>
              <Input
                id="coupon-limit"
                type="number"
                min={1}
                value={form.usageLimit}
                onChange={(e) => set('usageLimit', e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon-expiry">Valid until (optional)</Label>
            <Input id="coupon-expiry" type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
            Active
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {coupon ? 'Save Changes' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

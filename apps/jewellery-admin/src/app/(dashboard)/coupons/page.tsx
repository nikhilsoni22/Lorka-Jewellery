'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CouponType, type CouponResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCoupons, useDeleteCoupon } from '@/lib/hooks/coupons';
import { extractMessage } from '@/lib/api-utils';
import { CouponFormDialog } from '@/components/coupons/coupon-form-dialog';

function couponStatus(c: CouponResponse): { label: string; variant: 'success' | 'muted' | 'destructive' } {
  if (!c.isActive) return { label: 'Inactive', variant: 'muted' };
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label: 'Expired', variant: 'destructive' };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { label: 'Used up', variant: 'destructive' };
  return { label: 'Active', variant: 'success' };
}

export default function CouponsPage() {
  const { data, isLoading } = useCoupons();
  const deleteCoupon = useDeleteCoupon();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CouponResponse | undefined>();
  const [pendingDelete, setPendingDelete] = useState<CouponResponse | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl">Coupons</h1>
          <p className="mt-1 text-muted-foreground">Discount codes customers can use at checkout.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New Coupon
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Min. order</TableHead>
              <TableHead>Used</TableHead>
              <TableHead>Valid until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((c) => {
              const status = couponStatus(c);
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-mono font-medium">{c.code}</p>
                    {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                  </TableCell>
                  <TableCell>
                    {c.type === CouponType.Percentage ? `${c.value}% off` : `₹${c.value} off`}
                    {c.maxDiscount !== null && <span className="block text-xs text-muted-foreground">up to ₹{c.maxDiscount}</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.minOrderAmount ? `₹${c.minOrderAmount}` : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.usedCount}
                    {c.usageLimit !== null ? ` / ${c.usageLimit}` : ''}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'No expiry'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit coupon"
                        onClick={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete coupon" onClick={() => setPendingDelete(c)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No coupons yet. Create one for your next sale or festival.
        </div>
      )}

      <CouponFormDialog open={formOpen} onOpenChange={setFormOpen} coupon={editing} />

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete coupon?</DialogTitle>
            <DialogDescription>
              &ldquo;{pendingDelete?.code}&rdquo; will stop working immediately. To pause it instead, edit it and untick Active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteCoupon.isPending}
              onClick={() =>
                pendingDelete &&
                deleteCoupon.mutate(pendingDelete.id, {
                  onSuccess: () => {
                    toast.success('Coupon deleted');
                    setPendingDelete(null);
                  },
                  onError: (err) => toast.error(extractMessage(err, 'Unable to delete coupon')),
                })
              }
            >
              {deleteCoupon.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

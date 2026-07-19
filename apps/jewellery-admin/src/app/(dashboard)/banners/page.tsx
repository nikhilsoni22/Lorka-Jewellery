'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { BannerResponse } from '@lorka/types';
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
import { useBanners, useDeleteBanner } from '@/lib/hooks/banners';
import { extractMessage } from '@/lib/api-utils';
import { BannerFormDialog } from '@/components/banners/banner-form-dialog';

export default function BannersPage() {
  const { data: banners, isLoading } = useBanners();
  const deleteBanner = useDeleteBanner();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BannerResponse | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<BannerResponse | null>(null);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (banner: BannerResponse) => {
    setEditing(banner);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteBanner.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Banner deleted');
        setPendingDelete(null);
      },
      onError: (err) => toast.error(extractMessage(err, 'Unable to delete banner')),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl">Banners</h1>
          <p className="mt-1 text-muted-foreground">Manage homepage hero and promo banners.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Banner
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : banners && banners.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Banner</TableHead>
              <TableHead>Placement</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.map((banner) => (
              <TableRow key={banner.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={banner.image}
                      alt=""
                      className="h-10 w-16 rounded-md border border-border object-cover"
                    />
                    <span className="font-medium">{banner.title}</span>
                  </div>
                </TableCell>
                <TableCell className="capitalize text-muted-foreground">{banner.placement}</TableCell>
                <TableCell className="text-muted-foreground">{banner.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={banner.isActive ? 'success' : 'muted'}>
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(banner)} aria-label="Edit banner">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingDelete(banner)}
                      aria-label="Delete banner"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No banners yet. Click &ldquo;Add Banner&rdquo; to create your first one.
        </div>
      )}

      <BannerFormDialog open={formOpen} onOpenChange={setFormOpen} banner={editing} />

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete banner?</DialogTitle>
            <DialogDescription>
              This will permanently remove &ldquo;{pendingDelete?.title}&rdquo;. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteBanner.isPending}>
              {deleteBanner.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

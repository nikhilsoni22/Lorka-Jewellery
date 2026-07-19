'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createBannerSchema, type CreateBannerInput, type BannerResponse } from '@lorka/types';
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
import { useCreateBanner, useUpdateBanner } from '@/lib/hooks/banners';
import { extractMessage } from '@/lib/api-utils';
import { BannerImageUpload } from './banner-image-upload';

const emptyDefaults: CreateBannerInput = {
  title: '',
  subtitle: '',
  image: '',
  href: '',
  placement: 'hero',
  sortOrder: 0,
  isActive: true,
};

export function BannerFormDialog({
  open,
  onOpenChange,
  banner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner?: BannerResponse;
}) {
  const isEditing = Boolean(banner);
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner(banner?.id ?? '');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateBannerInput>({
    resolver: zodResolver(createBannerSchema),
    defaultValues: emptyDefaults,
  });

  const image = watch('image');

  useEffect(() => {
    if (open) {
      reset(
        banner
          ? {
              title: banner.title,
              subtitle: banner.subtitle,
              image: banner.image,
              href: banner.href,
              placement: banner.placement as 'hero' | 'promo',
              sortOrder: banner.sortOrder,
              isActive: banner.isActive,
            }
          : emptyDefaults,
      );
    }
  }, [open, banner, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      if (isEditing) {
        await updateBanner.mutateAsync(values);
      } else {
        await createBanner.mutateAsync(values);
      }
      toast.success(isEditing ? 'Banner updated' : 'Banner created');
      onOpenChange(false);
    } catch (err) {
      toast.error(extractMessage(err, 'Unable to save banner'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Banner' : 'Add Banner'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update this banner.' : 'Create a new homepage banner.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="ban-title">Title</Label>
            <Input id="ban-title" {...register('title')} placeholder="Festive Silver Collection" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ban-subtitle">Subtitle</Label>
            <Input id="ban-subtitle" {...register('subtitle')} />
          </div>

          <div className="space-y-2">
            <Label>Banner Image</Label>
            <BannerImageUpload
              value={image}
              onChange={(url) => setValue('image', url, { shouldValidate: true, shouldDirty: true })}
            />
            {errors.image && <p className="text-sm text-destructive">{errors.image.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ban-href">Link (optional)</Label>
            <Input id="ban-href" {...register('href')} placeholder="/collections/festive" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ban-placement">Placement</Label>
              <Select id="ban-placement" {...register('placement')}>
                <option value="hero">Hero (homepage top)</option>
                <option value="promo">Promo</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ban-sort">Sort order</Label>
              <Input id="ban-sort" type="number" {...register('sortOrder')} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox {...register('isActive')} />
            Active
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Banner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

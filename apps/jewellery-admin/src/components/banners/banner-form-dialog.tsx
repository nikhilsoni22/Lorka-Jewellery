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
import { SingleImageUpload } from '@/components/single-image-upload';

const emptyDefaults: CreateBannerInput = {
  title: '',
  subtitle: '',
  image: '',
  href: '',
  placement: 'hero',
  sortOrder: 0,
  isActive: true,
};

/** ISO string -> value for <input type="datetime-local"> in the admin's local time. */
function toDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Blank -> null (clears the date on update), otherwise a Date. */
const dateOrNull = (v: unknown) => (v ? new Date(String(v)) : null);

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
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateBannerInput>({
    resolver: zodResolver(createBannerSchema),
    defaultValues: emptyDefaults,
  });

  const image = watch('image');
  const placement = watch('placement');
  const isFestival = placement === 'festival';

  useEffect(() => {
    if (open) {
      reset(
        banner
          ? {
              title: banner.title,
              subtitle: banner.subtitle,
              image: banner.image,
              href: banner.href,
              placement: banner.placement,
              sortOrder: banner.sortOrder,
              isActive: banner.isActive,
              // datetime-local needs a string; setValueAs below turns it back into a Date.
              startDate: toDatetimeLocal(banner.startDate) as unknown as Date,
              endDate: toDatetimeLocal(banner.endDate) as unknown as Date,
            }
          : emptyDefaults,
      );
    }
  }, [open, banner, reset]);

  const submit = handleSubmit(async (formValues) => {
    // Hero banners are text-only; every other placement needs an image / GIF / video.
    const values = formValues.placement === 'hero' ? { ...formValues, image: '' } : formValues;
    if (values.placement !== 'hero' && !values.image) {
      setError('image', { message: 'Please upload an image, GIF or video' });
      return;
    }
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
            {isEditing
              ? 'Update this banner.'
              : 'Create a homepage banner or a festival background.'}
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

          {placement !== 'hero' && (
            <div className="space-y-2">
              <Label>{isFestival ? 'Festival GIF / Video' : 'Banner Image'}</Label>
              <SingleImageUpload
                uploadPath={isFestival ? '/uploads/festival' : '/uploads/banners'}
                {...(isFestival
                  ? {
                      fieldName: 'media',
                      accept: 'image/gif,image/webp,image/png,image/jpeg,video/mp4,video/webm',
                      hint: 'GIF, WEBP, PNG, JPG, MP4 or WEBM, up to 20MB. Landscape (16:9) looks best.',
                      noun: 'GIF / video',
                    }
                  : {})}
                value={image}
                onChange={(url) =>
                  setValue('image', url, { shouldValidate: true, shouldDirty: true })
                }
              />
              {errors.image && <p className="text-sm text-destructive">{errors.image.message}</p>}
            </div>
          )}

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
                <option value="festival">Festival background (homepage top GIF / video)</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ban-sort">Sort order</Label>
              <Input id="ban-sort" type="number" {...register('sortOrder')} />
            </div>
          </div>

          {isFestival && (
            <p className="rounded-md border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
              Your GIF/video plays in the background of the homepage top section (behind the header
              and hero), getting softly blurred towards the bottom and fading into the page.
              Landscape videos work best. Set Starts/Ends so it appears only during the festival. If
              several are live, the one with the lowest sort order is shown.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ban-start">Starts at (optional)</Label>
              <Input
                id="ban-start"
                type="datetime-local"
                {...register('startDate', { setValueAs: dateOrNull })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ban-end">Ends at (optional)</Label>
              <Input
                id="ban-end"
                type="datetime-local"
                {...register('endDate', { setValueAs: dateOrNull })}
              />
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

'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createProductSchema, MetalType, type CreateProductInput, type ProductResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategories } from '@/lib/hooks/categories';
import { useSettings } from '@/lib/hooks/settings';
import { extractMessage } from '@/lib/api-utils';
import { ImageUpload } from './image-upload';

interface ProductFormProps {
  defaultValues?: Partial<CreateProductInput>;
  onSubmit: (input: CreateProductInput) => Promise<ProductResponse>;
  submitLabel: string;
}

export function ProductForm({ defaultValues, onSubmit, submitLabel }: ProductFormProps) {
  const router = useRouter();
  const { data: categoriesData } = useCategories({ limit: 100 });
  const { data: settings } = useSettings();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: '',
      description: '',
      shortDescription: '',
      category: '',
      sku: '',
      metalType: MetalType.Silver,
      makingCharge: 0,
      images: [],
      material: '',
      purity: '',
      weight: undefined,
      stock: 0,
      isFeatured: false,
      isActive: true,
      ...defaultValues,
    },
  });

  const metalType = watch('metalType');
  const weight = Number(watch('weight')) || 0;
  const makingCharge = Number(watch('makingCharge')) || 0;
  const discountPercent = Number(watch('discountPercent')) || 0;
  // Silver is quoted per kg (÷1000g); gold follows the Indian convention of per 10g (÷10g).
  const perGramRate =
    metalType === MetalType.Gold
      ? settings?.goldRatePer10g !== undefined
        ? settings.goldRatePer10g / 10
        : undefined
      : settings?.silverRatePerKg !== undefined
        ? settings.silverRatePerKg / 1000
        : undefined;
  const livePrice =
    perGramRate !== undefined ? Math.round((perGramRate * weight + makingCharge) * 100) / 100 : undefined;
  const offerPrice =
    livePrice !== undefined && discountPercent > 0
      ? Math.round(livePrice * (1 - discountPercent / 100) * 100) / 100
      : undefined;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      toast.success('Product saved');
      router.push('/products');
      router.refresh();
    } catch (err) {
      toast.error(extractMessage(err, 'Unable to save product'));
    }
  });

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Basic details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select id="category" {...field}>
                  <option value="">Select a category…</option>
                  {categoriesData?.items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            />
            {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register('sku')} placeholder="RNG-001" />
            {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="shortDescription">Short description</Label>
            <Input id="shortDescription" {...register('shortDescription')} maxLength={300} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} rows={4} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing &amp; stock</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="metalType">Metal</Label>
            <Controller
              control={control}
              name="metalType"
              render={({ field }) => (
                <Select id="metalType" {...field}>
                  <option value={MetalType.Silver}>Silver</option>
                  <option value={MetalType.Gold}>Gold</option>
                </Select>
              )}
            />
            {errors.metalType && <p className="text-sm text-destructive">{errors.metalType.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (grams)</Label>
            <Input id="weight" type="number" step="0.01" {...register('weight')} />
            {errors.weight && <p className="text-sm text-destructive">{errors.weight.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="makingCharge">Making charge (₹)</Label>
            <Input id="makingCharge" type="number" step="0.01" {...register('makingCharge')} />
            {errors.makingCharge && (
              <p className="text-sm text-destructive">{errors.makingCharge.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="discountPercent">Offer (% off, optional)</Label>
            <Input
              id="discountPercent"
              type="number"
              step="1"
              min={0}
              max={100}
              placeholder="e.g. 10"
              {...register('discountPercent')}
            />
            {errors.discountPercent && (
              <p className="text-sm text-destructive">{errors.discountPercent.message}</p>
            )}
            {offerPrice !== undefined && (
              <p className="text-xs text-muted-foreground">
                Offer price: ₹{offerPrice.toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" type="number" {...register('stock')} />
            {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label>Calculated price</Label>
            <p className="text-lg font-medium">
              {livePrice !== undefined ? `₹${livePrice.toLocaleString('en-IN')}` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              Weight × today&apos;s {metalType === MetalType.Gold ? 'gold' : 'silver'} rate (set in Settings) +
              making charge. Updates automatically whenever the admin changes the metal rate.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Material &amp; specifications</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="material">Material</Label>
            <Input id="material" {...register('material')} placeholder="Sterling Silver" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purity">Purity / Hallmark</Label>
            <Input id="purity" {...register('purity')} placeholder="925" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name="images"
            render={({ field }) => <ImageUpload value={field.value ?? []} onChange={field.onChange} />}
          />
          {errors.images && <p className="mt-2 text-sm text-destructive">{errors.images.message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox {...register('isActive')} />
            Active (visible on storefront)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox {...register('isFeatured')} />
            Featured
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/products')}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

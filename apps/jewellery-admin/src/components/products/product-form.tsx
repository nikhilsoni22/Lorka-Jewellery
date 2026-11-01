'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createProductSchema,
  MAX_PRODUCT_VARIANTS,
  MetalType,
  type CreateProductInput,
  type ProductResponse,
} from '@lorka/types';
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
      makingChargePerGram: 0,
      images: [],
      material: '',
      purity: '',
      variants: [{ weight: undefined, stock: 0 }],
      isFeatured: false,
      isActive: true,
      ...defaultValues,
    },
  });

  const { fields: variantFields, append: addVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'variants',
  });

  const metalType = watch('metalType');
  const variants = watch('variants') ?? [];
  const makingChargePerGram = Number(watch('makingChargePerGram')) || 0;
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
  const round2 = (n: number) => Math.round(n * 100) / 100;
  /** Same formula as the API, so the preview matches the price customers see. */
  const pricePreview = (weight: number) => {
    if (perGramRate === undefined || !(weight > 0)) return undefined;
    const makingCharge = round2(weight * makingChargePerGram);
    const price = round2(perGramRate * weight + makingCharge);
    const offerPrice = discountPercent > 0 ? round2(price * (1 - discountPercent / 100)) : undefined;
    return { makingCharge, price, offerPrice };
  };
  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const variantsError = errors.variants?.root?.message ?? errors.variants?.message;

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
            <Label htmlFor="makingChargePerGram">Making charge (₹ per gram)</Label>
            <Input
              id="makingChargePerGram"
              type="number"
              step="0.01"
              placeholder="e.g. 60"
              {...register('makingChargePerGram')}
            />
            {errors.makingChargePerGram && (
              <p className="text-sm text-destructive">{errors.makingChargePerGram.message}</p>
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
          </div>

          <div className="space-y-3 sm:col-span-3">
            <div>
              <Label>Weights, stock &amp; price</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                The first weight is required; add up to {MAX_PRODUCT_VARIANTS - 1} more if this design comes in
                other weights. Each weight has its own stock, and its price is weight × (today&apos;s{' '}
                {metalType === MetalType.Gold ? 'gold' : 'silver'} rate (set in Settings) + making charge per gram)
                — it updates automatically whenever the metal rate changes.
              </p>
            </div>

            {variantFields.map((field, index) => {
              const preview = pricePreview(Number(variants[index]?.weight));
              const fieldErrors = errors.variants?.[index];
              return (
                <div
                  key={field.id}
                  className="grid items-start gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_1.4fr_auto]"
                >
                  <div className="space-y-1">
                    <Label htmlFor={`variants.${index}.weight`} className="text-xs">
                      Weight {index + 1} (grams){index === 0 ? '' : ' — optional'}
                    </Label>
                    <Input
                      id={`variants.${index}.weight`}
                      type="number"
                      step="0.01"
                      placeholder="e.g. 16"
                      {...register(`variants.${index}.weight`)}
                    />
                    {fieldErrors?.weight && <p className="text-sm text-destructive">{fieldErrors.weight.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`variants.${index}.stock`} className="text-xs">
                      Stock
                    </Label>
                    <Input id={`variants.${index}.stock`} type="number" {...register(`variants.${index}.stock`)} />
                    {fieldErrors?.stock && <p className="text-sm text-destructive">{fieldErrors.stock.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium">Price</span>
                    {preview ? (
                      <>
                        <p className="font-medium">
                          {preview.offerPrice !== undefined ? (
                            <>
                              {inr(preview.offerPrice)}{' '}
                              <span className="text-xs text-muted-foreground line-through">{inr(preview.price)}</span>
                            </>
                          ) : (
                            inr(preview.price)
                          )}
                        </p>
                        {makingChargePerGram > 0 && (
                          <p className="text-xs text-muted-foreground">
                            incl. making {variants[index]?.weight}g × {inr(makingChargePerGram)}/g ={' '}
                            {inr(preview.makingCharge)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="font-medium text-muted-foreground">—</p>
                    )}
                  </div>
                  <div className="pt-5">
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove weight ${index + 1}`}
                        onClick={() => removeVariant(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {variantsError && <p className="text-sm text-destructive">{variantsError}</p>}

            {variantFields.length < MAX_PRODUCT_VARIANTS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addVariant({ weight: undefined as unknown as number, stock: 0 })}
              >
                <Plus className="mr-1 h-4 w-4" /> Add another weight
              </Button>
            )}
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

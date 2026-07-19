'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createProductSchema, type CreateProductInput, type ProductResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategories } from '@/lib/hooks/categories';
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

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: '',
      description: '',
      shortDescription: '',
      category: '',
      sku: '',
      price: 0,
      images: [],
      material: '',
      purity: '',
      stock: 0,
      isFeatured: false,
      isActive: true,
      ...defaultValues,
    },
  });

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
            <Label htmlFor="price">Price (₹)</Label>
            <Input id="price" type="number" step="0.01" {...register('price')} />
            {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="discountPrice">Offer price (₹)</Label>
            <Input id="discountPrice" type="number" step="0.01" {...register('discountPrice')} />
            {errors.discountPrice && (
              <p className="text-sm text-destructive">{errors.discountPrice.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" type="number" {...register('stock')} />
            {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Material &amp; specifications</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="material">Material</Label>
            <Input id="material" {...register('material')} placeholder="Sterling Silver" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purity">Purity / Hallmark</Label>
            <Input id="purity" {...register('purity')} placeholder="925" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (grams)</Label>
            <Input id="weight" type="number" step="0.01" {...register('weight')} />
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

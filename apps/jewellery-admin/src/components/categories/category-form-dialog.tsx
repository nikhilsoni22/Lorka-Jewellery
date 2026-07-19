'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createCategorySchema, type CreateCategoryInput, type CategoryResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCreateCategory, useUpdateCategory } from '@/lib/hooks/categories';
import { extractMessage } from '@/lib/api-utils';

const emptyDefaults: CreateCategoryInput = {
  name: '',
  description: '',
  image: '',
  isFeatured: false,
  isActive: true,
  sortOrder: 0,
};

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass an existing category to edit it; omit to create a new one. */
  category?: CategoryResponse;
}) {
  const isEditing = Boolean(category);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory(category?.id ?? '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (open) {
      reset(
        category
          ? {
              name: category.name,
              description: category.description,
              image: category.image,
              isFeatured: category.isFeatured,
              isActive: category.isActive,
              sortOrder: category.sortOrder,
            }
          : emptyDefaults,
      );
    }
  }, [open, category, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      if (isEditing) {
        await updateCategory.mutateAsync(values);
      } else {
        await createCategory.mutateAsync(values);
      }
      toast.success(isEditing ? 'Category updated' : 'Category created');
      onOpenChange(false);
    } catch (err) {
      toast.error(extractMessage(err, 'Unable to save category'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'Add Category'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update this category.' : 'Create a new product category.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" {...register('name')} placeholder="Silver Rings" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-description">Description</Label>
            <Textarea id="cat-description" {...register('description')} rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-image">Image URL</Label>
            <Input id="cat-image" {...register('image')} placeholder="https://…" />
            {errors.image && <p className="text-sm text-destructive">{errors.image.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-sort">Sort order</Label>
            <Input id="cat-sort" type="number" {...register('sortOrder')} />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox {...register('isActive')} />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox {...register('isFeatured')} />
              Featured
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

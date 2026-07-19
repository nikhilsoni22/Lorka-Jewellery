'use client';

import { ProductForm } from '@/components/products/product-form';
import { useCreateProduct } from '@/lib/hooks/products';

export default function NewProductPage() {
  const createProduct = useCreateProduct();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Add Product</h1>
        <p className="mt-1 text-muted-foreground">Create a new item in your jewellery catalog.</p>
      </div>
      <ProductForm submitLabel="Create Product" onSubmit={(input) => createProduct.mutateAsync(input)} />
    </div>
  );
}

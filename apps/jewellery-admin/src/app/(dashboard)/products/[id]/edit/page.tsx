'use client';

import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ProductForm } from '@/components/products/product-form';
import { useProduct, useUpdateProduct } from '@/lib/hooks/products';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(params.id);
  const updateProduct = useUpdateProduct(params.id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return <p className="text-muted-foreground">Product not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Edit Product</h1>
        <p className="mt-1 text-muted-foreground">{product.name}</p>
      </div>
      <ProductForm
        key={product.id}
        submitLabel="Save Changes"
        defaultValues={{
          name: product.name,
          description: product.description,
          shortDescription: product.shortDescription,
          category: product.category,
          sku: product.sku,
          price: product.price,
          discountPrice: product.discountPrice,
          images: product.images,
          material: product.material,
          purity: product.purity,
          weight: product.weight,
          stock: product.stock,
          isFeatured: product.isFeatured,
          isActive: product.isActive,
        }}
        onSubmit={(input) => updateProduct.mutateAsync(input)}
      />
    </div>
  );
}

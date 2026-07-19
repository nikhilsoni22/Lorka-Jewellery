'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductResponse } from '@lorka/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useDeleteProduct } from '@/lib/hooks/products';
import { extractMessage } from '@/lib/api-utils';

export function ProductTable({ products }: { products: ProductResponse[] }) {
  const [pendingDelete, setPendingDelete] = useState<ProductResponse | null>(null);
  const deleteProduct = useDeleteProduct();

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteProduct.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Product deleted');
        setPendingDelete(null);
      },
      onError: (err) => toast.error(extractMessage(err, 'Unable to delete product')),
    });
  };

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        No products yet. Click &ldquo;Add Product&rdquo; to create your first one.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt=""
                      className="h-10 w-10 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md border border-dashed border-border" />
                  )}
                  <span className="font-medium">{product.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{product.sku}</TableCell>
              <TableCell className="text-muted-foreground">{product.categoryName ?? '—'}</TableCell>
              <TableCell>
                {product.discountPrice ? (
                  <span>
                    <span className="font-medium">₹{product.discountPrice}</span>{' '}
                    <span className="text-xs text-muted-foreground line-through">₹{product.price}</span>
                  </span>
                ) : (
                  <span>₹{product.price}</span>
                )}
              </TableCell>
              <TableCell>{product.stock}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Badge variant={product.isActive ? 'success' : 'muted'}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {product.isFeatured && <Badge variant="secondary">Featured</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Link
                    href={`/products/${product.id}/edit`}
                    aria-label="Edit product"
                    className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDelete(product)}
                    aria-label="Delete product"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>
              This will permanently remove &ldquo;{pendingDelete?.name}&rdquo;. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteProduct.isPending}>
              {deleteProduct.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

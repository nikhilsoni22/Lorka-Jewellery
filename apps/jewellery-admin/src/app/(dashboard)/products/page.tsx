'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProducts } from '@/lib/hooks/products';
import { ProductTable } from '@/components/products/product-table';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useProducts({ search: search || undefined, limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl">Products</h1>
          <p className="mt-1 text-muted-foreground">Manage your jewellery catalog.</p>
        </div>
        <Link href="/products/new" className="inline-flex">
          <Button>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ProductTable products={data?.items ?? []} />
      )}
    </div>
  );
}

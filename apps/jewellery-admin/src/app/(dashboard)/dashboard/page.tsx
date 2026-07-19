'use client';

import { Gem, ShoppingBag, Users, Tags } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { useProducts } from '@/lib/hooks/products';
import { useCategories } from '@/lib/hooks/categories';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: products, isLoading: productsLoading } = useProducts({ limit: 1 });
  const { data: categories, isLoading: categoriesLoading } = useCategories({ limit: 1 });

  const stats = [
    {
      label: 'Products',
      value: productsLoading ? '—' : String(products?.meta?.total ?? 0),
      icon: Gem,
      note: 'Total products in catalog',
    },
    {
      label: 'Categories',
      value: categoriesLoading ? '—' : String(categories?.meta?.total ?? 0),
      icon: Tags,
      note: 'Total categories',
    },
    { label: 'Orders', value: '—', icon: ShoppingBag, note: 'Available in a later phase' },
    { label: 'Customers', value: '—', icon: Users, note: 'Available in a later phase' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl">Welcome back, {user?.name}</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your product catalog below. Orders and analytics arrive in the next phases.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, note }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-sans font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-silver" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif">{value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phase 2 complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>✓ Product, Category, and Banner management</p>
          <p>✓ Public catalog API for the storefront</p>
          <p>✓ Dynamic homepage pulling live products and banners</p>
        </CardContent>
      </Card>
    </div>
  );
}

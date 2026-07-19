'use client';

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCustomers } from '@/lib/hooks/customers';
import { CustomerTable } from '@/components/customers/customer-table';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useCustomers({ search: search || undefined, limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Customers</h1>
        <p className="mt-1 text-muted-foreground">Everyone who has registered on the website.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CustomerTable customers={data?.items ?? []} />
      )}
    </div>
  );
}

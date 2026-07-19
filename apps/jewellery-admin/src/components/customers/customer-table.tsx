'use client';

import type { AdminUserResponse } from '@lorka/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function CustomerTable({ customers }: { customers: AdminUserResponse[] }) {
  if (customers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        No customers yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Registered</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="font-medium">{customer.name}</TableCell>
            <TableCell className="text-muted-foreground">{customer.email}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <Badge variant={customer.emailVerified ? 'success' : 'outline'}>
                  {customer.emailVerified ? 'Verified' : 'Unverified'}
                </Badge>
                {customer.isBlocked && <Badge variant="destructive">Blocked</Badge>}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(customer.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

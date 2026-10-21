'use client';

import { toast } from 'sonner';
import type { AdminUserResponse } from '@lorka/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSetCustomerBlocked } from '@/lib/hooks/customers';
import { extractMessage } from '@/lib/api-utils';

export function CustomerTable({ customers }: { customers: AdminUserResponse[] }) {
  const setBlocked = useSetCustomerBlocked();

  const toggleBlocked = (customer: AdminUserResponse) => {
    if (customer.isBlocked) {
      if (!window.confirm(`Unblock ${customer.name}? They will be able to place orders and write reviews again.`)) return;
      setBlocked.mutate(
        { id: customer.id, blocked: false },
        {
          onSuccess: () => toast.success(`${customer.name} unblocked`),
          onError: (err) => toast.error(extractMessage(err, 'Unable to unblock this customer')),
        },
      );
      return;
    }
    const reason = window.prompt(
      `Block ${customer.name}? They can still sign in and raise support tickets, but can't place orders or write reviews.

Reason (shown to the customer, optional):`,
      '',
    );
    if (reason === null) return;
    setBlocked.mutate(
      { id: customer.id, blocked: true, reason },
      {
        onSuccess: () => toast.success(`${customer.name} blocked`),
        onError: (err) => toast.error(extractMessage(err, 'Unable to block this customer')),
      },
    );
  };

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
          <TableHead className="text-right">Actions</TableHead>
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
              {customer.isBlocked && customer.blockedReason && (
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">{customer.blockedReason}</p>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(customer.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant={customer.isBlocked ? 'outline' : 'destructive'}
                onClick={() => toggleBlocked(customer)}
                disabled={setBlocked.isPending && setBlocked.variables?.id === customer.id}
              >
                {customer.isBlocked ? 'Unblock' : 'Block'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

'use client';

import Link from 'next/link';
import type { TicketResponse } from '@lorka/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT = {
  open: 'outline',
  in_progress: 'secondary',
  resolved: 'success',
  closed: 'muted',
} as const;

export function TicketTable({ tickets }: { tickets: TicketResponse[] }) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        No tickets yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id} className="cursor-pointer">
            <TableCell>
              <Link href={`/tickets/${ticket.id}`} className="font-medium hover:underline">
                {ticket.subject}
              </Link>
            </TableCell>
            <TableCell>
              <div>{ticket.customerName}</div>
              <div className="text-xs text-muted-foreground">{ticket.customerEmail}</div>
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[ticket.status as keyof typeof STATUS_VARIANT]}>
                {ticket.status.replace('_', ' ')}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(ticket.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

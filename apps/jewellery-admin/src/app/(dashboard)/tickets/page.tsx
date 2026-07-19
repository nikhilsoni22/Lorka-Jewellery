'use client';

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import type { TicketStatus } from '@lorka/types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useTickets } from '@/lib/hooks/tickets';
import { TicketTable } from '@/components/tickets/ticket-table';

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[];

export default function TicketsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const { data, isLoading } = useTickets({
    search: search || undefined,
    status: status || undefined,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Tickets</h1>
        <p className="mt-1 text-muted-foreground">View and respond to customer support tickets.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject, customer, email…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus | '')}
          className="max-w-[180px]"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <TicketTable tickets={data?.items ?? []} />
      )}
    </div>
  );
}

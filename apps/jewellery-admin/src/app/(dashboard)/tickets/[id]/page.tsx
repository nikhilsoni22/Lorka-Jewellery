'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TicketStatus } from '@lorka/types';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useTicket, useUpdateTicketStatus } from '@/lib/hooks/tickets';
import { extractMessage } from '@/lib/api-utils';

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[];

const STATUS_VARIANT = {
  open: 'outline',
  in_progress: 'secondary',
  resolved: 'success',
  closed: 'muted',
} as const;

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: ticket, isLoading } = useTicket(params.id);
  const updateStatus = useUpdateTicketStatus(params.id);
  const [pendingStatus, setPendingStatus] = useState<TicketStatus | ''>('');

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ticket) {
    return <p className="text-muted-foreground">Ticket not found.</p>;
  }

  const handleUpdateStatus = () => {
    if (!pendingStatus) return;
    updateStatus.mutate(pendingStatus, {
      onSuccess: () => {
        toast.success('Ticket status updated');
        setPendingStatus('');
      },
      onError: (err) => toast.error(extractMessage(err, 'Unable to update ticket status')),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl">{ticket.subject}</h1>
          <p className="mt-1 text-muted-foreground">
            Raised on {new Date(ticket.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[ticket.status as keyof typeof STATUS_VARIANT]}>
          {ticket.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Message</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{ticket.message}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Customer</p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>{ticket.customerName}</p>
              <p>{ticket.customerEmail}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Update Status</p>
            <div className="mt-2 flex gap-2">
              <Select
                value={pendingStatus}
                onChange={(e) => setPendingStatus(e.target.value as TicketStatus | '')}
              >
                <option value="" disabled>
                  Select status…
                </option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </Select>
              <Button onClick={handleUpdateStatus} disabled={!pendingStatus || updateStatus.isPending}>
                {updateStatus.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Update
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

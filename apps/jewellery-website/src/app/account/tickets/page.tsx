'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TicketResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-muted text-muted-foreground',
};

export default function AccountTicketsPage() {
  const { status: authStatus } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketResponse[] | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/account/login?redirect=/account/tickets');
    }
  }, [authStatus, router]);

  const loadTickets = () => {
    apiClient
      .get<TicketResponse[]>('/tickets/mine?limit=100')
      .then(setTickets)
      .catch(() => setTickets([]));
  };

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post<TicketResponse>('/tickets', { subject, message });
      toast.success('Ticket submitted');
      setSubject('');
      setMessage('');
      loadTickets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (authStatus !== 'authenticated' || tickets === null) {
    return (
      <main className="container py-20">
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  return (
    <main className="container py-12">
      <h1 className="text-3xl">My Tickets</h1>
      <p className="mt-2 text-muted-foreground">Raise a support ticket and track its status here.</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-medium">Raise a Ticket</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <input
                type="text"
                required
                maxLength={140}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={cn(inputClass, 'mt-1')}
                placeholder="What do you need help with?"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <textarea
                required
                maxLength={2000}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={cn(inputClass, 'mt-1 resize-none')}
                placeholder="Describe your issue…"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </Button>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-medium">Your Tickets</h2>
          {tickets.length === 0 ? (
            <p className="mt-6 text-center text-muted-foreground">No tickets yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{ticket.subject}</p>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                        STATUS_STYLES[ticket.status],
                      )}
                    >
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{ticket.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

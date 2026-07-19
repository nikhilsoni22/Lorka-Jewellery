'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse, TicketResponse, TicketStatus, PaginationMeta } from '@lorka/types';
import { api } from '../api';

export interface TicketListQuery {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  search?: string;
}

export function useTickets(query: TicketListQuery = {}) {
  return useQuery({
    queryKey: ['tickets', query],
    queryFn: async (): Promise<{ items: TicketResponse[]; meta?: PaginationMeta }> => {
      const { data } = await api.get<ApiResponse<TicketResponse[]>>('/tickets', { params: query });
      if (!data.success) throw new Error(data.message);
      return { items: data.data, meta: data.meta };
    },
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['ticket', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<TicketResponse> => {
      const { data } = await api.get<ApiResponse<TicketResponse>>(`/tickets/${id}`);
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });
}

export function useUpdateTicketStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (status: TicketStatus): Promise<TicketResponse> => {
      const { data } = await api.patch<ApiResponse<TicketResponse>>(`/tickets/${id}/status`, { status });
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });
}

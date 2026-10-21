'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse, AdminUserResponse, PaginationMeta } from '@lorka/types';
import { api } from '../api';

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  isBlocked?: boolean;
}

export function useCustomers(query: CustomerListQuery = {}) {
  return useQuery({
    queryKey: ['customers', query],
    queryFn: async (): Promise<{ items: AdminUserResponse[]; meta?: PaginationMeta }> => {
      const { data } = await api.get<ApiResponse<AdminUserResponse[]>>('/users', {
        params: { ...query, role: 'customer' },
      });
      if (!data.success) throw new Error(data.message);
      return { items: data.data, meta: data.meta };
    },
  });
}

/** Blocked customers can still sign in and raise tickets, but can't order or review. */
export function useSetCustomerBlocked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; blocked: boolean; reason?: string }): Promise<AdminUserResponse> => {
      const { data } = await api.patch<ApiResponse<AdminUserResponse>>(`/users/${input.id}/block`, {
        blocked: input.blocked,
        reason: input.reason,
      });
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}

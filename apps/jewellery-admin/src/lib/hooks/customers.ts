'use client';

import { useQuery } from '@tanstack/react-query';
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

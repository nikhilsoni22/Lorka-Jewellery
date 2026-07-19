'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse, OrderResponse, OrderStatus, PaginationMeta } from '@lorka/types';
import { api } from '../api';

export interface OrderListQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  search?: string;
}

export function useOrders(query: OrderListQuery = {}) {
  return useQuery({
    queryKey: ['orders', query],
    queryFn: async (): Promise<{ items: OrderResponse[]; meta?: PaginationMeta }> => {
      const { data } = await api.get<ApiResponse<OrderResponse[]>>('/orders', { params: query });
      if (!data.success) throw new Error(data.message);
      return { items: data.data, meta: data.meta };
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<OrderResponse> => {
      const { data } = await api.get<ApiResponse<OrderResponse>>(`/orders/${id}`);
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });
}

export function useUpdateOrderStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (status: OrderStatus): Promise<OrderResponse> => {
      const { data } = await api.patch<ApiResponse<OrderResponse>>(`/orders/${id}/status`, { status });
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}

export function useSetBuildEta(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (estimatedReadyDate: string): Promise<OrderResponse> => {
      const { data } = await api.patch<ApiResponse<OrderResponse>>(`/orders/${id}/build-eta`, {
        estimatedReadyDate,
      });
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}

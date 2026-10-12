'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse, CouponResponse, PaginationMeta } from '@lorka/types';
import { api } from '../api';

/** Raw form values — the API validates and normalises them. */
export interface CouponPayload {
  code: string;
  description: string;
  type: string;
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  expiresAt: string | null;
  isActive: boolean;
}

export function useCoupons() {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: async (): Promise<{ items: CouponResponse[]; meta?: PaginationMeta }> => {
      const { data } = await api.get<ApiResponse<CouponResponse[]>>('/coupons', { params: { limit: 100 } });
      if (!data.success) throw new Error(data.message);
      return { items: data.data, meta: data.meta };
    },
  });
}

export function useSaveCoupon(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CouponPayload>): Promise<CouponResponse> => {
      const { data } = id
        ? await api.put<ApiResponse<CouponResponse>>(`/coupons/${id}`, input)
        : await api.post<ApiResponse<CouponResponse>>('/coupons', input);
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data } = await api.delete<ApiResponse<null>>(`/coupons/${id}`);
      if (!data.success) throw new Error(data.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  });
}

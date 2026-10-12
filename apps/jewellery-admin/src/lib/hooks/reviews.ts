'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse, PaginationMeta, ReviewResponse } from '@lorka/types';
import { api } from '../api';

export interface ReviewListQuery {
  page?: number;
  limit?: number;
  isVisible?: boolean;
  search?: string;
}

export function useReviews(query: ReviewListQuery = {}) {
  return useQuery({
    queryKey: ['reviews', query],
    queryFn: async (): Promise<{ items: ReviewResponse[]; meta?: PaginationMeta }> => {
      const { data } = await api.get<ApiResponse<ReviewResponse[]>>('/reviews', { params: query });
      if (!data.success) throw new Error(data.message);
      return { items: data.data, meta: data.meta };
    },
  });
}

export function useSetReviewVisible() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }): Promise<ReviewResponse> => {
      const { data } = await api.patch<ApiResponse<ReviewResponse>>(`/reviews/${id}`, { isVisible });
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data } = await api.delete<ApiResponse<null>>(`/reviews/${id}`);
      if (!data.success) throw new Error(data.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });
}

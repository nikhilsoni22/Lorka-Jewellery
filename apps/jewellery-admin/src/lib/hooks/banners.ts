'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse, CreateBannerInput, UpdateBannerInput, BannerResponse } from '@lorka/types';
import { api } from '../api';

export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: async (): Promise<BannerResponse[]> => {
      const { data } = await api.get<ApiResponse<BannerResponse[]>>('/banners/all');
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });
}

export function useCreateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBannerInput): Promise<BannerResponse> => {
      const { data } = await api.post<ApiResponse<BannerResponse>>('/banners', input);
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banners'] }),
  });
}

export function useUpdateBanner(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateBannerInput): Promise<BannerResponse> => {
      const { data } = await api.put<ApiResponse<BannerResponse>>(`/banners/${id}`, input);
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banners'] }),
  });
}

export function useDeleteBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(`/banners/${id}`);
      if (!data.success) throw new Error(data.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banners'] }),
  });
}

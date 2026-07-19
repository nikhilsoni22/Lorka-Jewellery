'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ApiResponse,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryResponse,
  PaginationMeta,
} from '@lorka/types';
import { api } from '../api';

export interface CategoryListQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  search?: string;
}

export function useCategories(query: CategoryListQuery = {}) {
  return useQuery({
    queryKey: ['categories', query],
    queryFn: async (): Promise<{ items: CategoryResponse[]; meta?: PaginationMeta }> => {
      const { data } = await api.get<ApiResponse<CategoryResponse[]>>('/categories', { params: query });
      if (!data.success) throw new Error(data.message);
      return { items: data.data, meta: data.meta };
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCategoryInput): Promise<CategoryResponse> => {
      const { data } = await api.post<ApiResponse<CategoryResponse>>('/categories', input);
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateCategoryInput): Promise<CategoryResponse> => {
      const { data } = await api.put<ApiResponse<CategoryResponse>>(`/categories/${id}`, input);
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(`/categories/${id}`);
      if (!data.success) throw new Error(data.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

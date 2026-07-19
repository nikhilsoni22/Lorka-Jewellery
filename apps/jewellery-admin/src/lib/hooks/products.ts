'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ApiResponse,
  CreateProductInput,
  UpdateProductInput,
  ProductResponse,
  PaginationMeta,
} from '@lorka/types';
import { api } from '../api';

export interface ProductListQuery {
  page?: number;
  limit?: number;
  category?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  search?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name_asc';
}

export function useProducts(query: ProductListQuery = {}) {
  return useQuery({
    queryKey: ['products', query],
    queryFn: async (): Promise<{ items: ProductResponse[]; meta?: PaginationMeta }> => {
      const { data } = await api.get<ApiResponse<ProductResponse[]>>('/products', { params: query });
      if (!data.success) throw new Error(data.message);
      return { items: data.data, meta: data.meta };
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<ProductResponse> => {
      const { data } = await api.get<ApiResponse<ProductResponse>>(`/products/${id}`);
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProductInput): Promise<ProductResponse> => {
      const { data } = await api.post<ApiResponse<ProductResponse>>('/products', input);
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProductInput): Promise<ProductResponse> => {
      const { data } = await api.put<ApiResponse<ProductResponse>>(`/products/${id}`, input);
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(`/products/${id}`);
      if (!data.success) throw new Error(data.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

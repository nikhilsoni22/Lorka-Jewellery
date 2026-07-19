'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse, SettingsResponse, UpdateSettingsInput } from '@lorka/types';
import { api } from '../api';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<SettingsResponse> => {
      const { data } = await api.get<ApiResponse<SettingsResponse>>('/settings');
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateSettingsInput): Promise<SettingsResponse> => {
      const { data } = await api.put<ApiResponse<SettingsResponse>>('/settings', input);
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

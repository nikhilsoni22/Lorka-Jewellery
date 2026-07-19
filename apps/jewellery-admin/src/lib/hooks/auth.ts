'use client';

import { useMutation } from '@tanstack/react-query';
import type { AdminLoginInput, ApiResponse, LoginResult } from '@lorka/types';
import { api } from '../api';
import { useAuth } from '../auth-context';

export function useLogin() {
  const { setSession } = useAuth();
  return useMutation({
    mutationFn: async (input: AdminLoginInput): Promise<LoginResult> => {
      const { data } = await api.post<ApiResponse<LoginResult>>('/auth/admin/login', input);
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: (result) => setSession(result),
    meta: { fallbackError: 'Unable to sign in' },
  });
}

export function useLogout() {
  const { clearSession } = useAuth();
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout').catch(() => undefined);
    },
    onSettled: () => clearSession(),
  });
}

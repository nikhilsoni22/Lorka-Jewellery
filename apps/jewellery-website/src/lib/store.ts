import type { SettingsResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { FALLBACK_SETTINGS } from '@/lib/store-defaults';

export { FALLBACK_SETTINGS, EMPTY_STORE_INFO, whatsappLink } from '@/lib/store-defaults';

/** Public site settings (server only) — store contact details, policies, rates. */
export async function getSettings(): Promise<SettingsResponse> {
  return apiGet<SettingsResponse>('/settings').catch(() => FALLBACK_SETTINGS);
}

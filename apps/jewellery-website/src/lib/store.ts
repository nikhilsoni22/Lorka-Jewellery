import type { SettingsResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { FALLBACK_SETTINGS, normalizeSettings } from '@/lib/store-defaults';

export { FALLBACK_SETTINGS, EMPTY_STORE_INFO, normalizeSettings, whatsappLink } from '@/lib/store-defaults';

/** Public site settings (server only) — store contact details, policies, rates. */
export async function getSettings(): Promise<SettingsResponse> {
  return apiGet<SettingsResponse>('/settings').then(normalizeSettings, () => FALLBACK_SETTINGS);
}

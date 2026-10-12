import type { SettingsResponse, StoreInfoResponse } from '@lorka/types';

export const EMPTY_STORE_INFO: StoreInfoResponse = {
  phone: '',
  whatsappNumber: '',
  email: '',
  address: '',
  instagramUrl: '',
  facebookUrl: '',
  youtubeUrl: '',
  gstin: '',
};

/** Fallback when the API is unreachable, so pages still render. */
export const FALLBACK_SETTINGS: SettingsResponse = {
  silverRatePerKg: 0,
  goldRatePer10g: 0,
  charges: [],
  maintenance: { enabled: false, message: '' },
  paymentMethods: { onlineEnabled: true, codEnabled: true },
  storeInfo: EMPTY_STORE_INFO,
  policies: { privacy: '', terms: '', refund: '', shipping: '' },
};

/** wa.me link with an optional pre-filled message, or '' when no WhatsApp number is set. */
export function whatsappLink(number: string, message?: string): string {
  if (!number) return '';
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

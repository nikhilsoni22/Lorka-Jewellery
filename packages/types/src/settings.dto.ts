import type { z } from 'zod';
import type { updateSettingsSchema } from './settings.schemas';

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export interface ChargeResponse {
  id: string;
  name: string;
  type: string;
  value: number;
  isActive: boolean;
}

export interface MaintenanceResponse {
  enabled: boolean;
  startAt?: string;
  endAt?: string;
  message: string;
}

export interface PaymentMethodsResponse {
  /** Online payment via Razorpay (card / UPI / netbanking). */
  onlineEnabled: boolean;
  codEnabled: boolean;
  /** Manual UPI: the customer pays `upiId` from their UPI app, then the admin verifies it. */
  upiEnabled: boolean;
  upiId: string;
  /** Name shown in the customer's UPI app — usually the name on the bank account. */
  upiPayeeName: string;
}

/** Public contact details shown in the website footer, contact page and WhatsApp button. */
export interface StoreInfoResponse {
  phone: string;
  /** Digits with country code, e.g. 919876543210 — used for wa.me links. */
  whatsappNumber: string;
  email: string;
  address: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  gstin: string;
}

/** Policy page bodies (plain text, blank lines separate paragraphs). Empty = website default. */
export interface PoliciesResponse {
  privacy: string;
  terms: string;
  refund: string;
  shipping: string;
}

export interface SettingsResponse {
  silverRatePerKg: number;
  goldRatePer10g: number;
  charges: ChargeResponse[];
  maintenance: MaintenanceResponse;
  paymentMethods: PaymentMethodsResponse;
  storeInfo: StoreInfoResponse;
  policies: PoliciesResponse;
  /** Only present when fetched by an authenticated admin — omitted from the public response. */
  notificationEmail?: string;
  /** Only present when fetched by an authenticated admin — omitted from the public response. */
  razorpayKeyId?: string;
  /** Only present when fetched by an authenticated admin — omitted from the public response. */
  razorpayKeySecret?: string;
  /** Only present when fetched by an authenticated admin — omitted from the public response. */
  razorpayWebhookSecret?: string;
}

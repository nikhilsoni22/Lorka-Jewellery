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

export interface SettingsResponse {
  silverRatePerKg: number;
  goldRatePer10g: number;
  charges: ChargeResponse[];
  maintenance: MaintenanceResponse;
  notificationEmail?: string;
  /** Only present when fetched by an authenticated admin — omitted from the public response. */
  razorpayKeyId?: string;
  /** Only present when fetched by an authenticated admin — omitted from the public response. */
  razorpayKeySecret?: string;
}

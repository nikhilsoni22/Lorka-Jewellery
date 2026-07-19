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
  charges: ChargeResponse[];
  maintenance: MaintenanceResponse;
  notificationEmail?: string;
}

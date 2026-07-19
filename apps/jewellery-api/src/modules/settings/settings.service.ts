import type { UpdateSettingsInput, SettingsResponse } from '@lorka/types';
import type { SettingsEntity } from '../../common/interfaces/entities';
import type { ISettingsRepository } from '../../common/interfaces/repositories';

export function toSettingsResponse(settings: SettingsEntity): SettingsResponse {
  return {
    charges: settings.charges.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      value: c.value,
      isActive: c.isActive,
    })),
    maintenance: {
      enabled: settings.maintenance.enabled,
      startAt: settings.maintenance.startAt ? settings.maintenance.startAt.toISOString() : undefined,
      endAt: settings.maintenance.endAt ? settings.maintenance.endAt.toISOString() : undefined,
      message: settings.maintenance.message,
    },
    notificationEmail: settings.notificationEmail,
  };
}

export class SettingsService {
  constructor(private readonly settings: ISettingsRepository) {}

  async get(): Promise<SettingsResponse> {
    const settings = await this.settings.get();
    return toSettingsResponse(settings);
  }

  async update(input: UpdateSettingsInput): Promise<SettingsResponse> {
    const updated = await this.settings.update({
      charges: input.charges.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        value: c.value,
        isActive: c.isActive ?? true,
      })),
      maintenance: {
        enabled: input.maintenance.enabled ?? false,
        startAt: input.maintenance.startAt ?? null,
        endAt: input.maintenance.endAt ?? null,
        message: input.maintenance.message ?? '',
      },
      notificationEmail: input.notificationEmail,
    });
    return toSettingsResponse(updated);
  }
}

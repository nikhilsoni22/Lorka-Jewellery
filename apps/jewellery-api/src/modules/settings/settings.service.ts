import type { UpdateSettingsInput, SettingsResponse } from '@lorka/types';
import type { SettingsEntity } from '../../common/interfaces/entities';
import type { ISettingsRepository } from '../../common/interfaces/repositories';

/** `includeRazorpayKeys` must only be true for authenticated admins — GET /settings is public
 * (the storefront reads maintenance mode / rates / charges without logging in), so the Razorpay
 * secret must never reach that response. */
export function toSettingsResponse(
  settings: SettingsEntity,
  includeRazorpayKeys: boolean,
): SettingsResponse {
  return {
    silverRatePerKg: settings.silverRatePerKg,
    goldRatePer10g: settings.goldRatePer10g,
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
    ...(includeRazorpayKeys
      ? { razorpayKeyId: settings.razorpayKeyId, razorpayKeySecret: settings.razorpayKeySecret }
      : {}),
  };
}

export class SettingsService {
  constructor(private readonly settings: ISettingsRepository) {}

  async get(includeRazorpayKeys: boolean): Promise<SettingsResponse> {
    const settings = await this.settings.get();
    return toSettingsResponse(settings, includeRazorpayKeys);
  }

  async update(input: UpdateSettingsInput): Promise<SettingsResponse> {
    const updated = await this.settings.update({
      silverRatePerKg: input.silverRatePerKg,
      goldRatePer10g: input.goldRatePer10g,
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
      razorpayKeyId: input.razorpayKeyId,
      razorpayKeySecret: input.razorpayKeySecret,
    });
    // update() is only reachable by an authenticated admin (route is role-gated), so it's safe
    // to always echo the keys back here.
    return toSettingsResponse(updated, true);
  }
}

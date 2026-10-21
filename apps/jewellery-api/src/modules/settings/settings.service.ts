import type { UpdateSettingsInput, SettingsResponse, StoreInfoResponse, PoliciesResponse } from '@lorka/types';
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
    paymentMethods: {
      onlineEnabled: settings.paymentMethods.onlineEnabled,
      codEnabled: settings.paymentMethods.codEnabled,
      upiEnabled: settings.paymentMethods.upiEnabled,
      upiId: settings.paymentMethods.upiId,
      upiPayeeName: settings.paymentMethods.upiPayeeName,
      upiPaymentWindowHours: settings.paymentMethods.upiPaymentWindowHours,
    },
    paymentPricing: settings.paymentPricing,
    storeInfo: settings.storeInfo ?? EMPTY_STORE_INFO,
    policies: settings.policies ?? EMPTY_POLICIES,
    ...(includeRazorpayKeys
      ? {
          notificationEmail: settings.notificationEmail,
          razorpayKeyId: settings.razorpayKeyId,
          razorpayKeySecret: settings.razorpayKeySecret,
          razorpayWebhookSecret: settings.razorpayWebhookSecret,
        }
      : {}),
  };
}

const EMPTY_STORE_INFO: StoreInfoResponse = {
  phone: '',
  whatsappNumber: '',
  email: '',
  address: '',
  instagramUrl: '',
  facebookUrl: '',
  youtubeUrl: '',
  gstin: '',
};

const EMPTY_POLICIES: PoliciesResponse = { privacy: '', terms: '', refund: '', shipping: '' };

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
      paymentMethods: {
        onlineEnabled: input.paymentMethods.onlineEnabled ?? true,
        codEnabled: input.paymentMethods.codEnabled ?? true,
        upiEnabled: input.paymentMethods.upiEnabled ?? false,
        upiId: input.paymentMethods.upiId ?? '',
        upiPayeeName: input.paymentMethods.upiPayeeName ?? '',
        upiPaymentWindowHours: input.paymentMethods.upiPaymentWindowHours ?? 24,
      },
      notificationEmail: input.notificationEmail,
      razorpayKeyId: input.razorpayKeyId,
      razorpayKeySecret: input.razorpayKeySecret,
      razorpayWebhookSecret: input.razorpayWebhookSecret,
      paymentPricing: input.paymentPricing,
      storeInfo: input.storeInfo,
      policies: input.policies,
    });
    // update() is only reachable by an authenticated admin (route is role-gated), so it's safe
    // to always echo the keys back here.
    return toSettingsResponse(updated, true);
  }
}

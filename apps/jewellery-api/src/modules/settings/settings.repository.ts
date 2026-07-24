import type { ChargeType } from '@lorka/types';
import type { SettingsEntity } from '../../common/interfaces/entities';
import type { ISettingsRepository, UpdateSettingsData } from '../../common/interfaces/repositories';
import { env } from '../../config/env';
import { SettingsModel, type SettingsDocument } from './settings.model';

function toEntity(doc: SettingsDocument): SettingsEntity {
  return {
    id: doc._id.toString(),
    silverRatePerKg: doc.silverRatePerKg ?? 0,
    goldRatePer10g: doc.goldRatePer10g ?? 0,
    charges: doc.charges.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      type: c.type as ChargeType,
      value: c.value,
      isActive: c.isActive ?? true,
    })),
    maintenance: {
      enabled: doc.maintenance?.enabled ?? false,
      startAt: doc.maintenance?.startAt ?? null,
      endAt: doc.maintenance?.endAt ?? null,
      message: doc.maintenance?.message ?? '',
    },
    notificationEmail: doc.notificationEmail || undefined,
    razorpayKeyId: doc.razorpayKeyId || undefined,
    razorpayKeySecret: doc.razorpayKeySecret || undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Settings live in a single singleton document — created lazily on first read/write. */
export class SettingsRepository implements ISettingsRepository {
  private async getDoc() {
    const existing = await SettingsModel.findOne().exec();
    if (existing) return existing;
    // One-time migration: seed the Razorpay keys from env so already-configured deployments
    // don't lose them. Going forward, keys are managed from Admin → Settings, not .env.
    return SettingsModel.create({
      razorpayKeyId: env.RAZORPAY_KEY_ID ?? '',
      razorpayKeySecret: env.RAZORPAY_KEY_SECRET ?? '',
    });
  }

  async get(): Promise<SettingsEntity> {
    const doc = await this.getDoc();
    return toEntity(doc.toObject() as SettingsDocument);
  }

  async update(data: UpdateSettingsData): Promise<SettingsEntity> {
    const doc = await this.getDoc();

    doc.set('silverRatePerKg', data.silverRatePerKg);
    doc.set('goldRatePer10g', data.goldRatePer10g);
    doc.set(
      'charges',
      data.charges.map((c) => ({
        ...(c.id ? { _id: c.id } : {}),
        name: c.name,
        type: c.type,
        value: c.value,
        isActive: c.isActive,
      })),
    );
    doc.set('maintenance', {
      enabled: data.maintenance.enabled,
      startAt: data.maintenance.startAt ?? null,
      endAt: data.maintenance.endAt ?? null,
      message: data.maintenance.message,
    });
    doc.set('notificationEmail', data.notificationEmail ?? '');
    doc.set('razorpayKeyId', data.razorpayKeyId ?? '');
    doc.set('razorpayKeySecret', data.razorpayKeySecret ?? '');

    await doc.save();
    return toEntity(doc.toObject() as SettingsDocument);
  }
}

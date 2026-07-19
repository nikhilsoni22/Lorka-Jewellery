import type { ChargeType } from '@lorka/types';
import type { SettingsEntity } from '../../common/interfaces/entities';
import type { ISettingsRepository, UpdateSettingsData } from '../../common/interfaces/repositories';
import { SettingsModel, type SettingsDocument } from './settings.model';

function toEntity(doc: SettingsDocument): SettingsEntity {
  return {
    id: doc._id.toString(),
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
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Settings live in a single singleton document — created lazily on first read/write. */
export class SettingsRepository implements ISettingsRepository {
  private async getDoc() {
    const existing = await SettingsModel.findOne().exec();
    if (existing) return existing;
    return SettingsModel.create({});
  }

  async get(): Promise<SettingsEntity> {
    const doc = await this.getDoc();
    return toEntity(doc.toObject() as SettingsDocument);
  }

  async update(data: UpdateSettingsData): Promise<SettingsEntity> {
    const doc = await this.getDoc();

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

    await doc.save();
    return toEntity(doc.toObject() as SettingsDocument);
  }
}

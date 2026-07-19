import type { BannerEntity } from '../../common/interfaces/entities';
import type {
  IBannerRepository,
  BannerFilter,
  CreateBannerData,
  UpdateBannerData,
} from '../../common/interfaces/repositories';
import { BannerModel, type BannerDocument } from './banner.model';

function toEntity(doc: BannerDocument): BannerEntity {
  return {
    id: doc._id.toString(),
    title: doc.title,
    subtitle: doc.subtitle,
    image: doc.image,
    href: doc.href,
    placement: doc.placement,
    sortOrder: doc.sortOrder,
    isActive: doc.isActive,
    startDate: doc.startDate ?? undefined,
    endDate: doc.endDate ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class BannerRepository implements IBannerRepository {
  async list(filter: BannerFilter): Promise<BannerEntity[]> {
    const query: Record<string, unknown> = {};
    if (filter.placement) query.placement = filter.placement;
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.onlyLive) {
      const now = new Date();
      query.$and = [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ];
    }
    const docs = await BannerModel.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean<BannerDocument[]>()
      .exec();
    return docs.map(toEntity);
  }

  async findById(id: string): Promise<BannerEntity | null> {
    const doc = await BannerModel.findById(id).lean<BannerDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async create(data: CreateBannerData): Promise<BannerEntity> {
    const doc = await BannerModel.create(data);
    return toEntity(doc.toObject() as BannerDocument);
  }

  async update(id: string, data: UpdateBannerData): Promise<BannerEntity | null> {
    const doc = await BannerModel.findByIdAndUpdate(id, data, { new: true })
      .lean<BannerDocument>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await BannerModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
}

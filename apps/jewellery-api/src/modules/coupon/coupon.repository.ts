import type { CouponType } from '@lorka/types';
import type { CouponEntity } from '../../common/interfaces/entities';
import type {
  ICouponRepository,
  CreateCouponData,
  UpdateCouponData,
  PagedResult,
  Pagination,
} from '../../common/interfaces/repositories';
import { CouponModel, type CouponDocument } from './coupon.model';

function toEntity(doc: CouponDocument): CouponEntity {
  return {
    id: doc._id.toString(),
    code: doc.code,
    description: doc.description ?? '',
    type: doc.type as CouponType,
    value: doc.value,
    minOrderAmount: doc.minOrderAmount ?? 0,
    maxDiscount: doc.maxDiscount ?? null,
    usageLimit: doc.usageLimit ?? null,
    usedCount: doc.usedCount ?? 0,
    expiresAt: doc.expiresAt ?? null,
    isActive: doc.isActive ?? true,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class CouponRepository implements ICouponRepository {
  async list(pagination: Pagination): Promise<PagedResult<CouponEntity>> {
    const skip = (pagination.page - 1) * pagination.limit;
    const [docs, total] = await Promise.all([
      CouponModel.find().sort({ createdAt: -1 }).skip(skip).limit(pagination.limit).lean<CouponDocument[]>().exec(),
      CouponModel.countDocuments().exec(),
    ]);
    return { items: docs.map(toEntity), total };
  }

  async findById(id: string): Promise<CouponEntity | null> {
    const doc = await CouponModel.findById(id).lean<CouponDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async findByCode(code: string): Promise<CouponEntity | null> {
    const doc = await CouponModel.findOne({ code: code.toUpperCase() }).lean<CouponDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async create(data: CreateCouponData): Promise<CouponEntity> {
    const doc = await CouponModel.create(data);
    return toEntity(doc.toObject() as CouponDocument);
  }

  async update(id: string, data: UpdateCouponData): Promise<CouponEntity | null> {
    const doc = await CouponModel.findByIdAndUpdate(id, data, { new: true }).lean<CouponDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    return (await CouponModel.findByIdAndDelete(id).exec()) !== null;
  }

  async redeem(code: string): Promise<boolean> {
    const result = await CouponModel.findOneAndUpdate(
      {
        code: code.toUpperCase(),
        $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
      },
      { $inc: { usedCount: 1 } },
    ).exec();
    return result !== null;
  }

  async forceRedeem(code: string): Promise<void> {
    await CouponModel.updateOne({ code: code.toUpperCase() }, { $inc: { usedCount: 1 } }).exec();
  }

  async release(code: string): Promise<void> {
    await CouponModel.updateOne({ code: code.toUpperCase(), usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }).exec();
  }
}

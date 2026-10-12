import mongoose from 'mongoose';
import type { ReviewEntity } from '../../common/interfaces/entities';
import type {
  IReviewRepository,
  ReviewFilter,
  CreateReviewData,
  PagedResult,
  Pagination,
} from '../../common/interfaces/repositories';
import { ReviewModel, type ReviewDocument } from './review.model';

function toEntity(doc: ReviewDocument): ReviewEntity {
  return {
    id: doc._id.toString(),
    productId: doc.productId.toString(),
    userId: doc.userId.toString(),
    userName: doc.userName,
    rating: doc.rating,
    title: doc.title ?? '',
    comment: doc.comment,
    images: doc.images ?? [],
    verifiedBuyer: doc.verifiedBuyer ?? false,
    isVisible: doc.isVisible ?? true,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class ReviewRepository implements IReviewRepository {
  async list(filter: ReviewFilter, pagination: Pagination): Promise<PagedResult<ReviewEntity>> {
    const query: Record<string, unknown> = {};
    if (filter.productId) query.productId = filter.productId;
    if (filter.isVisible !== undefined) query.isVisible = filter.isVisible;
    if (filter.search) {
      const term = { $regex: filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      query.$or = [{ userName: term }, { comment: term }, { title: term }];
    }
    const skip = (pagination.page - 1) * pagination.limit;
    const [docs, total] = await Promise.all([
      ReviewModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(pagination.limit).lean<ReviewDocument[]>().exec(),
      ReviewModel.countDocuments(query).exec(),
    ]);
    return { items: docs.map(toEntity), total };
  }

  async findById(id: string): Promise<ReviewEntity | null> {
    const doc = await ReviewModel.findById(id).lean<ReviewDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async findByUserAndProduct(userId: string, productId: string): Promise<ReviewEntity | null> {
    const doc = await ReviewModel.findOne({ userId, productId }).lean<ReviewDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async create(data: CreateReviewData): Promise<ReviewEntity> {
    const doc = await ReviewModel.create(data);
    return toEntity(doc.toObject() as ReviewDocument);
  }

  async setVisible(id: string, isVisible: boolean): Promise<ReviewEntity | null> {
    const doc = await ReviewModel.findByIdAndUpdate(id, { isVisible }, { new: true }).lean<ReviewDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<ReviewEntity | null> {
    const doc = await ReviewModel.findByIdAndDelete(id).lean<ReviewDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async ratingDistribution(productId: string): Promise<[number, number, number, number, number]> {
    const rows = await ReviewModel.aggregate<{ _id: number; count: number }>([
      { $match: { productId: new mongoose.Types.ObjectId(productId), isVisible: true } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]).exec();
    const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    for (const row of rows) {
      if (row._id >= 1 && row._id <= 5) distribution[row._id - 1] = row.count;
    }
    return distribution;
  }
}

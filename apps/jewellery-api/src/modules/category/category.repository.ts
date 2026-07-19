import type { CategoryEntity } from '../../common/interfaces/entities';
import type {
  ICategoryRepository,
  CategoryFilter,
  CreateCategoryData,
  UpdateCategoryData,
  PagedResult,
  Pagination,
} from '../../common/interfaces/repositories';
import { CategoryModel, type CategoryDocument } from './category.model';

function toEntity(doc: CategoryDocument): CategoryEntity {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    image: doc.image,
    isFeatured: doc.isFeatured,
    isActive: doc.isActive,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class CategoryRepository implements ICategoryRepository {
  async list(
    filter: CategoryFilter,
    pagination: Pagination,
  ): Promise<PagedResult<CategoryEntity>> {
    const query: Record<string, unknown> = {};
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.isFeatured !== undefined) query.isFeatured = filter.isFeatured;
    if (filter.search) query.name = { $regex: filter.search, $options: 'i' };

    const skip = (pagination.page - 1) * pagination.limit;
    const [docs, total] = await Promise.all([
      CategoryModel.find(query)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(pagination.limit)
        .lean<CategoryDocument[]>()
        .exec(),
      CategoryModel.countDocuments(query).exec(),
    ]);
    return { items: docs.map(toEntity), total };
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const doc = await CategoryModel.findById(id).lean<CategoryDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    const doc = await CategoryModel.findOne({ slug }).lean<CategoryDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const count = await CategoryModel.countDocuments(query).exec();
    return count > 0;
  }

  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    const doc = await CategoryModel.create(data);
    return toEntity(doc.toObject() as CategoryDocument);
  }

  async update(id: string, data: UpdateCategoryData): Promise<CategoryEntity | null> {
    const doc = await CategoryModel.findByIdAndUpdate(id, data, { new: true })
      .lean<CategoryDocument>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await CategoryModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
}

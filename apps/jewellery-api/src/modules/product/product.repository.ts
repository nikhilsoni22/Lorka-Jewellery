import { MetalType } from '@lorka/types';
import type { ProductEntity } from '../../common/interfaces/entities';
import type {
  IProductRepository,
  ProductFilter,
  CreateProductData,
  UpdateProductData,
  MetalRates,
  PagedResult,
  Pagination,
} from '../../common/interfaces/repositories';
import { ProductModel, type ProductDocument } from './product.model';

function toEntity(doc: ProductDocument): ProductEntity {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    shortDescription: doc.shortDescription,
    category: doc.category.toString(),
    sku: doc.sku,
    metalType: doc.metalType as MetalType,
    makingCharge: doc.makingCharge,
    discountPercent: doc.discountPercent ?? undefined,
    images: doc.images,
    material: doc.material,
    purity: doc.purity,
    weight: doc.weight,
    stock: doc.stock,
    isFeatured: doc.isFeatured,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const SORTS: Partial<Record<NonNullable<ProductFilter['sort']>, Record<string, 1 | -1>>> = {
  newest: { createdAt: -1 },
  name_asc: { name: 1 },
};

export class ProductRepository implements IProductRepository {
  async list(
    filter: ProductFilter,
    pagination: Pagination,
    rates: MetalRates,
  ): Promise<PagedResult<ProductEntity>> {
    const query: Record<string, unknown> = {};
    if (filter.category) query.category = filter.category;
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.isFeatured !== undefined) query.isFeatured = filter.isFeatured;
    if (filter.search) query.name = { $regex: filter.search, $options: 'i' };

    const skip = (pagination.page - 1) * pagination.limit;
    const sortKey = filter.sort ?? 'newest';

    // price_asc/price_desc sort by the live computed price (weight × metal rate + making
    // charge), which isn't a stored field, so it needs an aggregation instead of find().sort().
    if (sortKey === 'price_asc' || sortKey === 'price_desc') {
      // Silver is quoted per kg (÷1000g); gold follows the Indian convention of per 10g (÷10g).
      const priceExpr = {
        $add: [
          {
            $multiply: [
              '$weight',
              {
                $cond: [
                  { $eq: ['$metalType', MetalType.Gold] },
                  { $divide: [rates.goldRatePer10g, 10] },
                  { $divide: [rates.silverRatePerKg, 1000] },
                ],
              },
            ],
          },
          '$makingCharge',
        ],
      };
      const [result] = await ProductModel.aggregate([
        { $match: query },
        { $addFields: { __livePrice: priceExpr } },
        { $sort: { __livePrice: sortKey === 'price_asc' ? 1 : -1 } },
        {
          $facet: {
            items: [{ $skip: skip }, { $limit: pagination.limit }],
            total: [{ $count: 'count' }],
          },
        },
      ]).exec();
      const docs = (result?.items ?? []) as ProductDocument[];
      const total = result?.total?.[0]?.count ?? 0;
      return { items: docs.map(toEntity), total };
    }

    const sort = SORTS[sortKey] ?? SORTS.newest!;
    const [docs, total] = await Promise.all([
      ProductModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(pagination.limit)
        .lean<ProductDocument[]>()
        .exec(),
      ProductModel.countDocuments(query).exec(),
    ]);
    return { items: docs.map(toEntity), total };
  }

  async findById(id: string): Promise<ProductEntity | null> {
    const doc = await ProductModel.findById(id).lean<ProductDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async findBySlug(slug: string): Promise<ProductEntity | null> {
    const doc = await ProductModel.findOne({ slug }).lean<ProductDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    return (await ProductModel.countDocuments(query).exec()) > 0;
  }

  async existsBySku(sku: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = { sku };
    if (excludeId) query._id = { $ne: excludeId };
    return (await ProductModel.countDocuments(query).exec()) > 0;
  }

  async create(data: CreateProductData): Promise<ProductEntity> {
    const doc = await ProductModel.create(data);
    return toEntity(doc.toObject() as ProductDocument);
  }

  async update(id: string, data: UpdateProductData): Promise<ProductEntity | null> {
    const doc = await ProductModel.findByIdAndUpdate(id, data, { new: true })
      .lean<ProductDocument>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await ProductModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async decrementStock(id: string, quantity: number): Promise<boolean> {
    const result = await ProductModel.findOneAndUpdate(
      { _id: id, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
    ).exec();
    return result !== null;
  }

  async incrementStock(id: string, quantity: number): Promise<void> {
    await ProductModel.findByIdAndUpdate(id, { $inc: { stock: quantity } }).exec();
  }
}

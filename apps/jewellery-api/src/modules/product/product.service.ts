import type { ProductResponse, CreateProductInput, UpdateProductInput, ProductQuery } from '@lorka/types';
import type { ProductEntity } from '../../common/interfaces/entities';
import type { IProductRepository, ICategoryRepository } from '../../common/interfaces/repositories';
import { AppError } from '../../common/errors/app-error';
import { generateUniqueSlug } from '../../common/utils/slugify';

export function toProductResponse(product: ProductEntity, categoryName?: string): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    category: product.category,
    categoryName,
    sku: product.sku,
    price: product.price,
    discountPrice: product.discountPrice ?? undefined,
    images: product.images,
    material: product.material,
    purity: product.purity,
    weight: product.weight ?? undefined,
    stock: product.stock,
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export class ProductService {
  constructor(
    private readonly products: IProductRepository,
    private readonly categories: ICategoryRepository,
  ) {}

  async list(query: ProductQuery): Promise<{ items: ProductResponse[]; total: number }> {
    const result = await this.products.list(
      {
        category: query.category,
        isActive: query.isActive,
        isFeatured: query.isFeatured,
        search: query.search,
        sort: query.sort,
      },
      { page: query.page, limit: query.limit },
    );
    return { items: await this.withCategoryNames(result.items), total: result.total };
  }

  async getById(id: string): Promise<ProductResponse> {
    const product = await this.products.findById(id);
    if (!product) throw AppError.notFound('Product not found');
    return this.toResponseWithCategory(product);
  }

  async getBySlug(slug: string): Promise<ProductResponse> {
    const product = await this.products.findBySlug(slug);
    if (!product || !product.isActive) throw AppError.notFound('Product not found');
    return this.toResponseWithCategory(product);
  }

  async create(input: CreateProductInput): Promise<ProductResponse> {
    await this.assertCategoryExists(input.category);
    if (await this.products.existsBySku(input.sku)) {
      throw AppError.conflict('A product with this SKU already exists');
    }
    const slug = await generateUniqueSlug(input.slug ?? input.name, (candidate) =>
      this.products.existsBySlug(candidate),
    );
    const product = await this.products.create({ ...input, slug });
    return this.toResponseWithCategory(product);
  }

  async update(id: string, input: UpdateProductInput): Promise<ProductResponse> {
    const existing = await this.products.findById(id);
    if (!existing) throw AppError.notFound('Product not found');

    if (input.category) await this.assertCategoryExists(input.category);
    if (input.sku && (await this.products.existsBySku(input.sku, id))) {
      throw AppError.conflict('A product with this SKU already exists');
    }

    let slug: string | undefined;
    if (input.slug || input.name) {
      slug = await generateUniqueSlug(input.slug ?? input.name ?? existing.name, (candidate) =>
        this.products.existsBySlug(candidate, id),
      );
    }

    const updated = await this.products.update(id, { ...input, ...(slug ? { slug } : {}) });
    if (!updated) throw AppError.notFound('Product not found');
    return this.toResponseWithCategory(updated);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.products.delete(id);
    if (!deleted) throw AppError.notFound('Product not found');
  }

  // --- helpers -------------------------------------------------------------

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.categories.findById(categoryId);
    if (!category) throw AppError.badRequest('The selected category does not exist', {
      category: ['Category not found'],
    });
  }

  private async toResponseWithCategory(product: ProductEntity): Promise<ProductResponse> {
    const category = await this.categories.findById(product.category);
    return toProductResponse(product, category?.name);
  }

  private async withCategoryNames(products: ProductEntity[]): Promise<ProductResponse[]> {
    const categoryIds = [...new Set(products.map((p) => p.category))];
    const categories = await Promise.all(categoryIds.map((id) => this.categories.findById(id)));
    const nameById = new Map(categories.filter(Boolean).map((c) => [c!.id, c!.name]));
    return products.map((p) => toProductResponse(p, nameById.get(p.category)));
  }
}

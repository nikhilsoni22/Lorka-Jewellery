import type {
  ProductResponse,
  ProductVariantResponse,
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
} from '@lorka/types';
import type { ProductEntity, ProductVariantEntity } from '../../common/interfaces/entities';
import type {
  IProductRepository,
  ICategoryRepository,
  ISettingsRepository,
  MetalRates,
} from '../../common/interfaces/repositories';
import { AppError } from '../../common/errors/app-error';
import { generateUniqueSlug } from '../../common/utils/slugify';
import {
  computeProductPrice,
  computeDiscountedPrice,
  computeMakingCharge,
  metalRatePerGram,
} from '../../common/utils/pricing';

function toVariantResponse(
  product: ProductEntity,
  variant: ProductVariantEntity,
  rates: MetalRates,
): ProductVariantResponse {
  const price = computeProductPrice(variant.weight, product.makingChargePerGram, product.metalType, rates);
  const discountPrice = computeDiscountedPrice(price, product.discountPercent);
  const ratePerGram = metalRatePerGram(product.metalType, rates);
  return {
    weight: variant.weight,
    stock: variant.stock,
    price,
    discountPrice,
    priceBreakup: {
      metalRatePerGram: Math.round(ratePerGram * 100) / 100,
      metalValue: Math.round(ratePerGram * variant.weight * 100) / 100,
      makingChargePerGram: product.makingChargePerGram,
      makingCharge: computeMakingCharge(variant.weight, product.makingChargePerGram),
      offerDiscount: discountPrice !== undefined ? Math.round((price - discountPrice) * 100) / 100 : 0,
    },
  };
}

export function toProductResponse(
  product: ProductEntity,
  rates: MetalRates,
  categoryName?: string,
): ProductResponse {
  const variants = product.variants.map((v) => toVariantResponse(product, v, rates));
  // Lightest weight — the product's "from" price.
  const base = variants[0]!;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    category: product.category,
    categoryName,
    sku: product.sku,
    metalType: product.metalType,
    makingChargePerGram: product.makingChargePerGram,
    discountPercent: product.discountPercent ?? undefined,
    variants,
    weight: base.weight,
    price: base.price,
    discountPrice: base.discountPrice,
    priceBreakup: base.priceBreakup,
    stock: variants.reduce((sum, v) => sum + v.stock, 0),
    images: product.images,
    material: product.material,
    purity: product.purity,
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    ratingAvg: product.ratingAvg ?? 0,
    ratingCount: product.ratingCount ?? 0,
    soldCount: product.soldCount ?? 0,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export class ProductService {
  constructor(
    private readonly products: IProductRepository,
    private readonly categories: ICategoryRepository,
    private readonly settings: ISettingsRepository,
  ) {}

  async list(query: ProductQuery): Promise<{ items: ProductResponse[]; total: number }> {
    const rates = await this.getRates();
    const result = await this.products.list(
      {
        category: query.category,
        isActive: query.isActive,
        isFeatured: query.isFeatured,
        search: query.search,
        sort: query.sort,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        metalType: query.metalType,
        inStock: query.inStock,
        ids: query.ids,
      },
      { page: query.page, limit: query.limit },
      rates,
    );
    return { items: await this.withCategoryNames(result.items, rates), total: result.total };
  }

  async getById(id: string): Promise<ProductResponse> {
    const product = await this.products.findById(id);
    if (!product) throw AppError.notFound('Product not found');
    return this.toResponseWithCategory(product, await this.getRates());
  }

  async getBySlug(slug: string): Promise<ProductResponse> {
    const product = await this.products.findBySlug(slug);
    if (!product || !product.isActive) throw AppError.notFound('Product not found');
    return this.toResponseWithCategory(product, await this.getRates());
  }

  async create(input: CreateProductInput): Promise<ProductResponse> {
    await this.assertCategoryExists(input.category);
    if (await this.products.existsBySku(input.sku)) {
      throw AppError.conflict('A product with this SKU already exists');
    }
    this.assertValidDiscountPercent(input.discountPercent);
    const rates = await this.getRates();
    const slug = await generateUniqueSlug(input.slug ?? input.name, (candidate) =>
      this.products.existsBySlug(candidate),
    );
    const product = await this.products.create({ ...input, slug });
    return this.toResponseWithCategory(product, rates);
  }

  async update(id: string, input: UpdateProductInput): Promise<ProductResponse> {
    const existing = await this.products.findById(id);
    if (!existing) throw AppError.notFound('Product not found');

    if (input.category) await this.assertCategoryExists(input.category);
    if (input.sku && (await this.products.existsBySku(input.sku, id))) {
      throw AppError.conflict('A product with this SKU already exists');
    }

    this.assertValidDiscountPercent(input.discountPercent);
    const rates = await this.getRates();

    let slug: string | undefined;
    if (input.slug || input.name) {
      slug = await generateUniqueSlug(input.slug ?? input.name ?? existing.name, (candidate) =>
        this.products.existsBySlug(candidate, id),
      );
    }

    const updated = await this.products.update(id, { ...input, ...(slug ? { slug } : {}) });
    if (!updated) throw AppError.notFound('Product not found');
    return this.toResponseWithCategory(updated, rates);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.products.delete(id);
    if (!deleted) throw AppError.notFound('Product not found');
  }

  // --- helpers -------------------------------------------------------------

  private async getRates(): Promise<MetalRates> {
    const settings = await this.settings.get();
    return { silverRatePerKg: settings.silverRatePerKg, goldRatePer10g: settings.goldRatePer10g };
  }

  private assertValidDiscountPercent(discountPercent: number | null | undefined): void {
    if (discountPercent === null || discountPercent === undefined) return;
    if (discountPercent <= 0 || discountPercent > 100) {
      throw AppError.badRequest('Offer must be between 1 and 100 percent', {
        discountPercent: ['Offer must be between 1 and 100 percent'],
      });
    }
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.categories.findById(categoryId);
    if (!category) throw AppError.badRequest('The selected category does not exist', {
      category: ['Category not found'],
    });
  }

  private async toResponseWithCategory(product: ProductEntity, rates: MetalRates): Promise<ProductResponse> {
    const category = await this.categories.findById(product.category);
    return toProductResponse(product, rates, category?.name);
  }

  private async withCategoryNames(products: ProductEntity[], rates: MetalRates): Promise<ProductResponse[]> {
    const categoryIds = [...new Set(products.map((p) => p.category))];
    const categories = await Promise.all(categoryIds.map((id) => this.categories.findById(id)));
    const nameById = new Map(categories.filter(Boolean).map((c) => [c!.id, c!.name]));
    return products.map((p) => toProductResponse(p, rates, nameById.get(p.category)));
  }
}

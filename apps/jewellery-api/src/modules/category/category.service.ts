import type { CategoryResponse, CreateCategoryInput, UpdateCategoryInput, CategoryQuery } from '@lorka/types';
import type { CategoryEntity } from '../../common/interfaces/entities';
import type { ICategoryRepository, PagedResult } from '../../common/interfaces/repositories';
import { AppError } from '../../common/errors/app-error';
import { generateUniqueSlug } from '../../common/utils/slugify';

export function toCategoryResponse(category: CategoryEntity): CategoryResponse {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    isFeatured: category.isFeatured,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export class CategoryService {
  constructor(private readonly categories: ICategoryRepository) {}

  async list(query: CategoryQuery): Promise<{ items: CategoryResponse[]; total: number }> {
    const result: PagedResult<CategoryEntity> = await this.categories.list(
      { isActive: query.isActive, isFeatured: query.isFeatured, search: query.search },
      { page: query.page, limit: query.limit },
    );
    return { items: result.items.map(toCategoryResponse), total: result.total };
  }

  async getById(id: string): Promise<CategoryResponse> {
    const category = await this.categories.findById(id);
    if (!category) throw AppError.notFound('Category not found');
    return toCategoryResponse(category);
  }

  async getBySlug(slug: string): Promise<CategoryResponse> {
    const category = await this.categories.findBySlug(slug);
    if (!category || !category.isActive) throw AppError.notFound('Category not found');
    return toCategoryResponse(category);
  }

  async create(input: CreateCategoryInput): Promise<CategoryResponse> {
    const slug = await generateUniqueSlug(input.slug ?? input.name, (candidate) =>
      this.categories.existsBySlug(candidate),
    );
    const category = await this.categories.create({ ...input, slug });
    return toCategoryResponse(category);
  }

  async update(id: string, input: UpdateCategoryInput): Promise<CategoryResponse> {
    const existing = await this.categories.findById(id);
    if (!existing) throw AppError.notFound('Category not found');

    let slug: string | undefined;
    if (input.slug || input.name) {
      slug = await generateUniqueSlug(input.slug ?? input.name ?? existing.name, (candidate) =>
        this.categories.existsBySlug(candidate, id),
      );
    }

    const updated = await this.categories.update(id, { ...input, ...(slug ? { slug } : {}) });
    if (!updated) throw AppError.notFound('Category not found');
    return toCategoryResponse(updated);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.categories.delete(id);
    if (!deleted) throw AppError.notFound('Category not found');
  }
}

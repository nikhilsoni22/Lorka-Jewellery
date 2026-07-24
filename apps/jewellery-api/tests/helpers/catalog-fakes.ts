import type { CategoryEntity, ProductEntity, BannerEntity, SettingsEntity } from '../../src/common/interfaces/entities';
import type {
  ICategoryRepository,
  IProductRepository,
  IBannerRepository,
  ISettingsRepository,
  CategoryFilter,
  ProductFilter,
  BannerFilter,
  CreateCategoryData,
  UpdateCategoryData,
  CreateProductData,
  UpdateProductData,
  CreateBannerData,
  UpdateBannerData,
  UpdateSettingsData,
  PagedResult,
  Pagination,
} from '../../src/common/interfaces/repositories';

function paginate<T>(items: T[], pagination: Pagination): PagedResult<T> {
  const start = (pagination.page - 1) * pagination.limit;
  return { items: items.slice(start, start + pagination.limit), total: items.length };
}

export class FakeCategoryRepository implements ICategoryRepository {
  private readonly byId = new Map<string, CategoryEntity>();
  private seq = 0;

  async list(filter: CategoryFilter, pagination: Pagination): Promise<PagedResult<CategoryEntity>> {
    let items = [...this.byId.values()];
    if (filter.isActive !== undefined) items = items.filter((c) => c.isActive === filter.isActive);
    if (filter.isFeatured !== undefined) items = items.filter((c) => c.isFeatured === filter.isFeatured);
    if (filter.search) items = items.filter((c) => c.name.toLowerCase().includes(filter.search!.toLowerCase()));
    return paginate(items, pagination);
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    return this.byId.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    return [...this.byId.values()].find((c) => c.slug === slug) ?? null;
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    return [...this.byId.values()].some((c) => c.slug === slug && c.id !== excludeId);
  }

  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    const id = `cat_${++this.seq}`;
    const now = new Date();
    const entity: CategoryEntity = { id, createdAt: now, updatedAt: now, ...data };
    this.byId.set(id, entity);
    return { ...entity };
  }

  async update(id: string, data: UpdateCategoryData): Promise<CategoryEntity | null> {
    const existing = this.byId.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.byId.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.byId.delete(id);
  }
}

export class FakeProductRepository implements IProductRepository {
  private readonly byId = new Map<string, ProductEntity>();
  private seq = 0;

  async list(filter: ProductFilter, pagination: Pagination): Promise<PagedResult<ProductEntity>> {
    // Rates aren't needed here: this in-memory fake never sorts by the derived price field.
    let items = [...this.byId.values()];
    if (filter.category) items = items.filter((p) => p.category === filter.category);
    if (filter.isActive !== undefined) items = items.filter((p) => p.isActive === filter.isActive);
    if (filter.isFeatured !== undefined) items = items.filter((p) => p.isFeatured === filter.isFeatured);
    if (filter.search) items = items.filter((p) => p.name.toLowerCase().includes(filter.search!.toLowerCase()));
    return paginate(items, pagination);
  }

  async findById(id: string): Promise<ProductEntity | null> {
    return this.byId.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<ProductEntity | null> {
    return [...this.byId.values()].find((p) => p.slug === slug) ?? null;
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    return [...this.byId.values()].some((p) => p.slug === slug && p.id !== excludeId);
  }

  async existsBySku(sku: string, excludeId?: string): Promise<boolean> {
    return [...this.byId.values()].some((p) => p.sku === sku && p.id !== excludeId);
  }

  async create(data: CreateProductData): Promise<ProductEntity> {
    const id = `prod_${++this.seq}`;
    const now = new Date();
    const entity: ProductEntity = { id, createdAt: now, updatedAt: now, ...data };
    this.byId.set(id, entity);
    return { ...entity };
  }

  async update(id: string, data: UpdateProductData): Promise<ProductEntity | null> {
    const existing = this.byId.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.byId.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.byId.delete(id);
  }

  async decrementStock(id: string, quantity: number): Promise<boolean> {
    const existing = this.byId.get(id);
    if (!existing || existing.stock < quantity) return false;
    this.byId.set(id, { ...existing, stock: existing.stock - quantity });
    return true;
  }

  async incrementStock(id: string, quantity: number): Promise<void> {
    const existing = this.byId.get(id);
    if (!existing) return;
    this.byId.set(id, { ...existing, stock: existing.stock + quantity });
  }
}

export class FakeBannerRepository implements IBannerRepository {
  private readonly byId = new Map<string, BannerEntity>();
  private seq = 0;

  async list(filter: BannerFilter): Promise<BannerEntity[]> {
    let items = [...this.byId.values()];
    if (filter.placement) items = items.filter((b) => b.placement === filter.placement);
    if (filter.isActive !== undefined) items = items.filter((b) => b.isActive === filter.isActive);
    if (filter.onlyLive) {
      const now = new Date();
      items = items.filter(
        (b) => (!b.startDate || b.startDate <= now) && (!b.endDate || b.endDate >= now),
      );
    }
    return items;
  }

  async findById(id: string): Promise<BannerEntity | null> {
    return this.byId.get(id) ?? null;
  }

  async create(data: CreateBannerData): Promise<BannerEntity> {
    const id = `ban_${++this.seq}`;
    const now = new Date();
    const entity: BannerEntity = { id, createdAt: now, updatedAt: now, ...data };
    this.byId.set(id, entity);
    return { ...entity };
  }

  async update(id: string, data: UpdateBannerData): Promise<BannerEntity | null> {
    const existing = this.byId.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.byId.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.byId.delete(id);
  }
}

export class FakeSettingsRepository implements ISettingsRepository {
  private entity: SettingsEntity = {
    id: 'settings_1',
    silverRatePerKg: 80000,
    goldRatePer10g: 70000,
    charges: [],
    maintenance: { enabled: false, message: '' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  async get(): Promise<SettingsEntity> {
    return { ...this.entity };
  }

  async update(data: UpdateSettingsData): Promise<SettingsEntity> {
    this.entity = {
      ...this.entity,
      silverRatePerKg: data.silverRatePerKg,
      goldRatePer10g: data.goldRatePer10g,
      charges: data.charges.map((c, i) => ({ id: c.id ?? `charge_${i}`, ...c })),
      maintenance: data.maintenance,
      notificationEmail: data.notificationEmail,
      updatedAt: new Date(),
    };
    return { ...this.entity };
  }
}

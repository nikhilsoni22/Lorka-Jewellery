import { describe, it, expect, beforeEach } from 'vitest';
import { MetalType } from '@lorka/types';
import { ProductService } from '../../src/modules/product/product.service';
import { CategoryService } from '../../src/modules/category/category.service';
import {
  FakeProductRepository,
  FakeCategoryRepository,
  FakeSettingsRepository,
} from '../helpers/catalog-fakes';

let products: FakeProductRepository;
let categories: FakeCategoryRepository;
let settings: FakeSettingsRepository;
let productService: ProductService;
let categoryService: CategoryService;

const validInput = (overrides: Partial<Parameters<ProductService['create']>[0]> = {}) => ({
  name: 'Classic Silver Ring',
  description: '',
  shortDescription: '',
  category: '',
  sku: 'RNG-001',
  metalType: MetalType.Silver,
  makingCharge: 200,
  images: ['https://example.com/ring.jpg'],
  material: 'Sterling Silver',
  purity: '925',
  weight: 10,
  stock: 10,
  isFeatured: false,
  isActive: true,
  ...overrides,
});

beforeEach(async () => {
  products = new FakeProductRepository();
  categories = new FakeCategoryRepository();
  settings = new FakeSettingsRepository();
  productService = new ProductService(products, categories, settings);
  categoryService = new CategoryService(categories);
});

async function createCategory() {
  return categoryService.create({
    name: 'Rings',
    description: '',
    image: '',
    isFeatured: false,
    isActive: true,
    sortOrder: 0,
  });
}

describe('ProductService.create', () => {
  it('creates a product with a generated slug', async () => {
    const category = await createCategory();
    const product = await productService.create(validInput({ category: category.id }));
    expect(product.slug).toBe('classic-silver-ring');
    expect(product.categoryName).toBe('Rings');
  });

  it('rejects a product referencing a non-existent category', async () => {
    await expect(
      productService.create(validInput({ category: 'does-not-exist' })),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a duplicate SKU with 409', async () => {
    const category = await createCategory();
    await productService.create(validInput({ category: category.id }));
    await expect(
      productService.create(validInput({ category: category.id, name: 'Another Ring' })),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('disambiguates slugs on name collision', async () => {
    const category = await createCategory();
    const first = await productService.create(validInput({ category: category.id }));
    const second = await productService.create(
      validInput({ category: category.id, sku: 'RNG-002' }),
    );
    expect(first.slug).toBe('classic-silver-ring');
    expect(second.slug).toBe('classic-silver-ring-2');
  });
});

describe('ProductService.update', () => {
  it('throws not-found for a missing product', async () => {
    await expect(productService.update('missing', { name: 'x' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('rejects updating to a SKU used by another product', async () => {
    const category = await createCategory();
    const first = await productService.create(validInput({ category: category.id }));
    await productService.create(validInput({ category: category.id, sku: 'RNG-002', name: 'Other' }));
    await expect(
      productService.update(first.id, { sku: 'RNG-002' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('clears an existing offer when discountPercent is explicitly set to null', async () => {
    const category = await createCategory();
    const created = await productService.create(
      validInput({ category: category.id, discountPercent: 10 }),
    );
    expect(created.discountPercent).toBe(10);

    const updated = await productService.update(created.id, { discountPercent: null });
    expect(updated.discountPercent).toBeUndefined();
    expect(updated.discountPrice).toBeUndefined();
  });
});

describe('ProductService.list', () => {
  it('paginates and reports total count', async () => {
    const category = await createCategory();
    for (let i = 0; i < 3; i++) {
      await productService.create(
        validInput({ category: category.id, sku: `RNG-00${i}`, name: `Ring ${i}` }),
      );
    }
    const { items, total } = await productService.list({
      page: 1,
      limit: 2,
      sort: 'newest',
    });
    expect(total).toBe(3);
    expect(items).toHaveLength(2);
  });
});

describe('ProductService.getBySlug', () => {
  it('throws not-found for an inactive product', async () => {
    const category = await createCategory();
    const product = await productService.create(validInput({ category: category.id, isActive: false }));
    await expect(productService.getBySlug(product.slug)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('ProductService.delete', () => {
  it('throws not-found for a missing product', async () => {
    await expect(productService.delete('missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('live silver/gold pricing', () => {
  it('derives price from weight × metal rate + making charge, per metal type', async () => {
    const category = await createCategory();
    const silverProduct = await productService.create(
      validInput({ category: category.id, metalType: MetalType.Silver, weight: 10, makingCharge: 200 }),
    );
    const goldProduct = await productService.create(
      validInput({
        category: category.id,
        sku: 'RNG-GOLD-1',
        name: 'Gold Band',
        metalType: MetalType.Gold,
        weight: 5,
        makingCharge: 500,
      }),
    );

    // FakeSettingsRepository defaults: silverRatePerKg 80000 (=80/g), goldRatePer10g 70000 (=7000/g)
    expect(silverProduct.price).toBe(10 * 80 + 200);
    expect(goldProduct.price).toBe(5 * 7000 + 500);
  });

  it('recalculates every product price the moment the admin changes the metal rate', async () => {
    const category = await createCategory();
    const product = await productService.create(
      validInput({ category: category.id, metalType: MetalType.Silver, weight: 10, makingCharge: 200 }),
    );
    expect(product.price).toBe(10 * 80 + 200);

    await settings.update({
      silverRatePerKg: 100000,
      goldRatePer10g: 70000,
      charges: [],
      maintenance: { enabled: false, message: '' },
    });

    const repriced = await productService.getById(product.id);
    expect(repriced.price).toBe(10 * 100 + 200);
  });

  it('rejects an offer percent above 100', async () => {
    const category = await createCategory();
    await expect(
      productService.create(validInput({ category: category.id, discountPercent: 150 })),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('derives discountPrice from discountPercent applied to the calculated price', async () => {
    const category = await createCategory();
    const product = await productService.create(
      validInput({
        category: category.id,
        metalType: MetalType.Silver,
        weight: 10,
        makingCharge: 200,
        discountPercent: 10,
      }),
    );
    // price = 10 * 80 + 200 = 1000; 10% off = 900
    expect(product.price).toBe(1000);
    expect(product.discountPrice).toBe(900);
  });
});

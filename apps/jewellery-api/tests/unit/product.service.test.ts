import { describe, it, expect, beforeEach } from 'vitest';
import { ProductService } from '../../src/modules/product/product.service';
import { CategoryService } from '../../src/modules/category/category.service';
import { FakeProductRepository, FakeCategoryRepository } from '../helpers/catalog-fakes';

let products: FakeProductRepository;
let categories: FakeCategoryRepository;
let productService: ProductService;
let categoryService: CategoryService;

const validInput = (overrides: Partial<Parameters<ProductService['create']>[0]> = {}) => ({
  name: 'Classic Silver Ring',
  description: '',
  shortDescription: '',
  sku: 'RNG-001',
  price: 1499,
  images: ['https://example.com/ring.jpg'],
  material: 'Sterling Silver',
  purity: '925',
  stock: 10,
  isFeatured: false,
  isActive: true,
  ...overrides,
});

beforeEach(async () => {
  products = new FakeProductRepository();
  categories = new FakeCategoryRepository();
  productService = new ProductService(products, categories);
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

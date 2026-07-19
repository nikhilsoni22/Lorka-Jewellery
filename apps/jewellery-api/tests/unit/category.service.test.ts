import { describe, it, expect, beforeEach } from 'vitest';
import { CategoryService } from '../../src/modules/category/category.service';
import { FakeCategoryRepository } from '../helpers/catalog-fakes';

let categories: FakeCategoryRepository;
let service: CategoryService;

beforeEach(() => {
  categories = new FakeCategoryRepository();
  service = new CategoryService(categories);
});

const input = (overrides = {}) => ({
  name: 'Silver Chains',
  description: '',
  image: '',
  isFeatured: false,
  isActive: true,
  sortOrder: 0,
  ...overrides,
});

describe('CategoryService', () => {
  it('creates a category with a generated slug', async () => {
    const category = await service.create(input());
    expect(category.slug).toBe('silver-chains');
  });

  it('disambiguates slugs on name collision', async () => {
    const first = await service.create(input());
    const second = await service.create(input());
    expect(first.slug).toBe('silver-chains');
    expect(second.slug).toBe('silver-chains-2');
  });

  it('deletes a category', async () => {
    const category = await service.create(input());
    await service.delete(category.id);
    await expect(service.getById(category.id)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws not-found deleting a missing category', async () => {
    await expect(service.delete('missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});

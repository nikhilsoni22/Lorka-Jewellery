import { describe, it, expect, beforeEach } from 'vitest';
import { BannerService } from '../../src/modules/banner/banner.service';
import { FakeBannerRepository } from '../helpers/catalog-fakes';

let banners: FakeBannerRepository;
let service: BannerService;

beforeEach(() => {
  banners = new FakeBannerRepository();
  service = new BannerService(banners);
});

const input = (overrides = {}) => ({
  title: 'Festive Collection',
  subtitle: '',
  image: 'https://example.com/banner.jpg',
  href: '',
  placement: 'hero',
  sortOrder: 0,
  isActive: true,
  ...overrides,
});

describe('BannerService', () => {
  it('creates a banner', async () => {
    const banner = await service.create(input());
    expect(banner.title).toBe('Festive Collection');
  });

  it('excludes inactive banners from the public listing', async () => {
    await service.create(input({ isActive: false }));
    const visible = await service.listPublic({ placement: 'hero' });
    expect(visible).toHaveLength(0);
  });

  it('excludes banners outside their schedule window from the public listing', async () => {
    const future = new Date(Date.now() + 86_400_000);
    await service.create(input({ startDate: future }));
    const visible = await service.listPublic({ placement: 'hero' });
    expect(visible).toHaveLength(0);
  });

  it('lists everything (including inactive) for admins', async () => {
    await service.create(input({ isActive: false }));
    const all = await service.listAll();
    expect(all).toHaveLength(1);
  });

  it('throws not-found deleting a missing banner', async () => {
    await expect(service.delete('missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});

import type { BannerResponse, CategoryResponse, ProductResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { HeroBanner } from '@/components/hero-banner';
import { FestivalBackdrop } from '@/components/festival-backdrop';
import { TrustStrip } from '@/components/trust-strip';
import { CategoryGrid } from '@/components/category-grid';
import { PromoBanner } from '@/components/promo-banner';
import { StorySection } from '@/components/story-section';
import { ProductGrid } from '@/components/product-grid';

async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiGet<T>(path);
  } catch {
    return fallback;
  }
}

export default async function HomePage() {
  const [banners, promoBanners, festivalBanners, categories, featured, newArrivals] = await Promise.all([
    safeGet<BannerResponse[]>('/banners?placement=hero', []),
    safeGet<BannerResponse[]>('/banners?placement=promo', []),
    safeGet<BannerResponse[]>('/banners?placement=festival', []),
    safeGet<CategoryResponse[]>('/categories?limit=8&isActive=true', []),
    safeGet<ProductResponse[]>('/products?isFeatured=true&isActive=true&limit=8', []),
    safeGet<ProductResponse[]>('/products?sort=newest&isActive=true&limit=8', []),
  ]);

  const festival = festivalBanners[0];

  return (
    <main>
      <div className="relative isolate">
        {festival && <FestivalBackdrop src={festival.image} />}
        <HeroBanner banner={banners[0]} transparent={Boolean(festival)} />
      </div>
      <TrustStrip />
      <CategoryGrid categories={categories} />
      <PromoBanner banner={promoBanners[0]} />
      <StorySection />
      <ProductGrid id="featured" eyebrow="Handpicked" title="Featured Jewellery" products={featured} />
      <ProductGrid id="new-arrivals" eyebrow="Just In" title="New Arrivals" products={newArrivals} />
    </main>
  );
}

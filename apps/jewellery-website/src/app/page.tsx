import type { BannerResponse, CategoryResponse, ProductResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { HeroBanner } from '@/components/hero-banner';
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
  const [banners, promoBanners, categories, featured, newArrivals] = await Promise.all([
    safeGet<BannerResponse[]>('/banners?placement=hero', []),
    safeGet<BannerResponse[]>('/banners?placement=promo', []),
    safeGet<CategoryResponse[]>('/categories?limit=8&isActive=true', []),
    safeGet<ProductResponse[]>('/products?isFeatured=true&isActive=true&limit=8', []),
    safeGet<ProductResponse[]>('/products?sort=newest&isActive=true&limit=8', []),
  ]);

  return (
    <main>
      <HeroBanner banner={banners[0]} />
      <TrustStrip />
      <CategoryGrid categories={categories} />
      <PromoBanner banner={promoBanners[0]} />
      <StorySection />
      <ProductGrid id="featured" eyebrow="Handpicked" title="Featured Jewellery" products={featured} />
      <ProductGrid id="new-arrivals" eyebrow="Just In" title="New Arrivals" products={newArrivals} />
    </main>
  );
}

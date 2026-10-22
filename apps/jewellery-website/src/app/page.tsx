import type { BannerResponse, CategoryResponse, ProductResponse } from '@lorka/types';
import { apiGet } from '@/lib/api';
import { HeroBanner } from '@/components/hero-banner';
import { FestivalBand } from '@/components/festival-band';
import { TrustStrip } from '@/components/trust-strip';
import { CategoryGrid } from '@/components/category-grid';
import { PromoBanner } from '@/components/promo-banner';
import { StorySection } from '@/components/story-section';
import { ProductGrid } from '@/components/product-grid';
import { ConciergeBand } from '@/components/concierge-band';

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
  const spotlight = [...featured, ...newArrivals].find((p) => p.images.length > 0);
  // The second category shot, so the story doesn't repeat the photo already used up top.
  const categoryImages = categories.map((c) => c.image).filter(Boolean);
  const storyImage = categoryImages[1] ?? categoryImages[0];

  return (
    <main>
      <HeroBanner banner={banners[0]} spotlight={spotlight} />
      <TrustStrip />
      <CategoryGrid categories={categories} />
      <ProductGrid
        id="featured"
        eyebrow="Handpicked"
        title="Featured Pieces"
        subtitle="Our most-loved yantras and chains, chosen for their craft and meaning."
        products={featured}
      />
      <PromoBanner banner={promoBanners[0]} />
      {festival && <FestivalBand src={festival.image} href={festival.href} title={festival.title} />}
      <StorySection image={storyImage} />
      <ProductGrid id="new-arrivals" eyebrow="Just In" title="New Arrivals" products={newArrivals} />
      <ConciergeBand />
    </main>
  );
}

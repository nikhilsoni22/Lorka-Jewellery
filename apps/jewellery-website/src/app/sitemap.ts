import type { MetadataRoute } from 'next';
import type { ApiResponse, ProductResponse, CategoryResponse } from '@lorka/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const API_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1';

async function safeList<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
    const json = (await res.json()) as ApiResponse<T[]>;
    return json.success ? json.data : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    safeList<ProductResponse>('/products?isActive=true&limit=100'),
    safeList<CategoryResponse>('/categories?isActive=true&limit=100'),
  ]);

  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    ...categories.map((c) => ({
      url: `${SITE_URL}/categories/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}

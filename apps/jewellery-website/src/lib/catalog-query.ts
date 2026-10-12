import { PRODUCT_SORTS, type ProductSort } from '@lorka/types';

export interface CatalogParams {
  sort?: string;
  price?: string;
  metal?: string;
  inStock?: string;
}

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
];

/** Price bands — `value` is "min-max" in rupees, either end optional. */
export const PRICE_BANDS = [
  { value: '-1000', label: 'Under ₹1,000' },
  { value: '1000-3000', label: '₹1,000 – ₹3,000' },
  { value: '3000-5000', label: '₹3,000 – ₹5,000' },
  { value: '5000-10000', label: '₹5,000 – ₹10,000' },
  { value: '10000-', label: 'Above ₹10,000' },
];

export const METAL_OPTIONS = [
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
];

/** Turns the page's filter params into the API's product query string. */
export function catalogApiQuery(params: CatalogParams): string {
  const q = new URLSearchParams();
  if (params.sort && (PRODUCT_SORTS as readonly string[]).includes(params.sort)) q.set('sort', params.sort);
  const band = PRICE_BANDS.find((b) => b.value === params.price);
  if (band) {
    const [min, max] = band.value.split('-');
    if (min) q.set('minPrice', min);
    if (max) q.set('maxPrice', max);
  }
  if (params.metal && METAL_OPTIONS.some((m) => m.value === params.metal)) q.set('metalType', params.metal);
  if (params.inStock === '1') q.set('inStock', 'true');
  return q.toString();
}

export function hasActiveFilters(params: CatalogParams): boolean {
  return Boolean(params.price || params.metal || params.inStock === '1');
}

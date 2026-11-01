import { describe, it, expect } from 'vitest';
import { createProductSchema, updateProductSchema } from '@lorka/types';

const base = {
  name: 'Silk Chain',
  category: 'a'.repeat(24),
  sku: 'CHN-1',
  metalType: 'silver',
  images: ['https://example.com/a.png'],
};

describe('product weights (variants)', () => {
  it('requires at least one weight', () => {
    expect(createProductSchema.safeParse({ ...base, variants: [] }).success).toBe(false);
    expect(createProductSchema.safeParse(base).success).toBe(false);
  });

  it('allows at most 3 weights', () => {
    const variants = [16, 20, 25, 30].map((weight) => ({ weight, stock: 1 }));
    expect(createProductSchema.safeParse({ ...base, variants }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...base, variants: variants.slice(0, 3) }).success).toBe(true);
  });

  it('rejects the same weight twice, and a weight of 0', () => {
    expect(createProductSchema.safeParse({ ...base, variants: [{ weight: 16 }, { weight: 16 }] }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...base, variants: [{ weight: 0 }] }).success).toBe(false);
  });

  it('stores weights lightest first, with stock defaulting to 0', () => {
    const parsed = createProductSchema.parse({ ...base, variants: [{ weight: 25, stock: 2 }, { weight: 16 }] });
    expect(parsed.variants).toEqual([
      { weight: 16, stock: 0 },
      { weight: 25, stock: 2 },
    ]);
  });

  it('update: omitted weights are left untouched', () => {
    expect(updateProductSchema.parse({}).variants).toBeUndefined();
  });
});

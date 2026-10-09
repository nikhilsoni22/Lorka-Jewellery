import { describe, it, expect } from 'vitest';
import { createProductSchema, updateProductSchema } from '@lorka/types';

const base = {
  name: 'Ring',
  category: 'a'.repeat(24),
  sku: 'R-1',
  metalType: 'silver',
  images: ['https://example.com/a.png'],
  weight: 4,
};

describe('optional offer (discountPercent)', () => {
  it.each([undefined, '', null])('accepts %j as "no offer"', (value) => {
    const parsed = createProductSchema.parse({ ...base, discountPercent: value });
    expect(parsed.discountPercent ?? null).toBeNull();
  });

  it('keeps a real percentage', () => {
    expect(createProductSchema.parse({ ...base, discountPercent: 10 }).discountPercent).toBe(10);
  });

  it('still rejects 0 and >100', () => {
    expect(createProductSchema.safeParse({ ...base, discountPercent: 0 }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...base, discountPercent: 101 }).success).toBe(false);
  });

  it('update: null clears the offer, omitted leaves it untouched', () => {
    expect(updateProductSchema.parse({ discountPercent: null }).discountPercent).toBeNull();
    expect(updateProductSchema.parse({}).discountPercent).toBeUndefined();
  });
});

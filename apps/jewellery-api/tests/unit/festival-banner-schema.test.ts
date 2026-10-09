import { describe, it, expect } from 'vitest';
import { createBannerSchema, updateBannerSchema, isVideoUrl } from '@lorka/types';

const base = { title: 'Diwali', image: 'https://res.cloudinary.com/x/video/upload/a.mp4', placement: 'festival' };

describe('festival banner', () => {
  it('accepts the festival placement', () => {
    expect(createBannerSchema.safeParse(base).success).toBe(true);
  });

  it('keeps real dates and treats null as "clear the date"', () => {
    const parsed = updateBannerSchema.parse({ startDate: '2026-11-01T00:00:00Z', endDate: null });
    expect(parsed.startDate).toBeInstanceOf(Date);
    expect(parsed.endDate).toBeNull();
  });

  it('detects video vs image/gif URLs', () => {
    expect(isVideoUrl('https://x/y/a.mp4')).toBe(true);
    expect(isVideoUrl('https://x/y/a.webm?v=1')).toBe(true);
    expect(isVideoUrl('https://x/y/a.gif')).toBe(false);
  });
});

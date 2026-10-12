'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, SlidersHorizontal, X } from 'lucide-react';
import { METAL_OPTIONS, PRICE_BANDS, SORT_OPTIONS } from '@/lib/catalog-query';
import { cn } from '@/lib/utils';

/** Sort + filter bar. State lives in the URL so filtered pages can be shared and bookmarked. */
export function CatalogFilters({ resultCount }: { resultCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const clearAll = () => {
    const next = new URLSearchParams(params.toString());
    ['price', 'metal', 'inStock'].forEach((k) => next.delete(k));
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const price = params.get('price');
  const metal = params.get('metal');
  const inStock = params.get('inStock') === '1';
  const filtered = Boolean(price || metal || inStock);

  return (
    <div className="space-y-4 border-y border-border py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          {resultCount} piece{resultCount !== 1 ? 's' : ''}
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort by</span>
          <select
            value={params.get('sort') ?? 'newest'}
            onChange={(e) => update('sort', e.target.value === 'newest' ? null : e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {PRICE_BANDS.map((band) => (
          <Chip key={band.value} active={price === band.value} onClick={() => update('price', band.value)}>
            {band.label}
          </Chip>
        ))}
        <span className="mx-1 w-px shrink-0 bg-border" />
        {METAL_OPTIONS.map((m) => (
          <Chip key={m.value} active={metal === m.value} onClick={() => update('metal', m.value)}>
            {m.label}
          </Chip>
        ))}
        <Chip active={inStock} onClick={() => update('inStock', '1')}>
          In stock only
        </Chip>
        {filtered && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex shrink-0 items-center gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-background text-foreground hover:border-gold/60 hover:text-gold',
      )}
    >
      {children}
    </button>
  );
}

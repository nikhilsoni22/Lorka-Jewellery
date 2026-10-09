'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Search, Sparkles, X } from 'lucide-react';
import type { ApiResponse, ProductResponse } from '@lorka/types';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
const MAX_SUGGESTIONS = 6;

interface SearchCategory {
  name: string;
  slug: string;
}

/** Wraps the part of `text` that matches `query` in a gold highlight. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const index = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-semibold text-gold">{text.slice(index, index + q.length)}</mark>
      {text.slice(index + q.length)}
    </>
  );
}

export function SearchOverlay({ categories }: { categories: SearchCategory[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(-1);

  const trimmed = query.trim();

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setSearched(false);
    setActive(-1);
  }, []);

  // Ctrl/Cmd+K opens, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Lock page scroll while open and focus the input.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = previous;
      clearTimeout(t);
    };
  }, [open]);

  // Debounced live search; aborts stale requests so a slow earlier response can't overwrite a newer one.
  useEffect(() => {
    if (!open) return;
    if (trimmed.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/products?isActive=true&limit=${MAX_SUGGESTIONS}&search=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const json = (await res.json()) as ApiResponse<ProductResponse[]>;
        setResults(json.success ? json.data : []);
        setSearched(true);
        setActive(-1);
        setLoading(false);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setResults([]);
        setSearched(true);
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, open]);

  const matchedCategories = useMemo(() => {
    if (trimmed.length < 2) return [];
    const q = trimmed.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 4);
  }, [categories, trimmed]);

  const goToResults = () => {
    if (!trimmed) return;
    const target = `/search?q=${encodeURIComponent(trimmed)}`;
    close();
    router.push(target);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (results.length ? (i <= 0 ? results.length - 1 : i - 1) : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = results[active];
      if (picked) {
        close();
        router.push(`/products/${picked.slug}`);
      } else {
        goToResults();
      }
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="inline-flex text-foreground transition-colors hover:text-gold"
      >
        <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Search products">
          <div
            className="absolute inset-0 animate-in fade-in bg-foreground/50 backdrop-blur-md duration-300"
            onClick={close}
          />

          <div className="relative animate-in slide-in-from-top-4 fade-in border-b border-gold/30 bg-background shadow-2xl duration-300">
            <div className="container py-6 sm:py-10">
              <div className="mx-auto max-w-3xl">
                <div className="mb-5 flex items-center justify-between">
                  <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.35em] text-gold">
                    <Sparkles className="h-3.5 w-3.5" />
                    Discover
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close search"
                    className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] sm:inline">Esc</span>
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="group relative">
                  <Search
                    className="absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2 text-gold"
                    strokeWidth={1.5}
                  />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Search rings, pendants, silver, gold…"
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Search products"
                    className="w-full bg-transparent py-4 pl-10 pr-10 font-serif text-2xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none sm:text-3xl"
                  />
                  {loading ? (
                    <Loader2 className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-gold" />
                  ) : (
                    query && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => {
                          setQuery('');
                          inputRef.current?.focus();
                        }}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-5 w-5" strokeWidth={1.5} />
                      </button>
                    )
                  )}
                  <span className="absolute bottom-0 left-0 h-px w-full bg-border" />
                  <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-gold via-gold-light to-gold transition-transform duration-500 group-focus-within:scale-x-100" />
                </div>

                <div className="mt-6 max-h-[60vh] overflow-y-auto pr-1">
                  {trimmed.length < 2 && (
                    <div>
                      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
                        {trimmed.length === 1 ? 'Keep typing…' : 'Browse by category'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {categories.slice(0, 8).map((c) => (
                          <Link
                            key={c.slug}
                            href={`/categories/${c.slug}`}
                            onClick={close}
                            className="rounded-full border border-border px-4 py-1.5 text-sm transition-all hover:border-gold hover:bg-secondary hover:text-gold"
                          >
                            {c.name}
                          </Link>
                        ))}
                        {categories.length === 0 && (
                          <p className="text-sm text-muted-foreground">Start typing to search our collection.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {matchedCategories.length > 0 && (
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
                        Categories
                      </span>
                      {matchedCategories.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/categories/${c.slug}`}
                          onClick={close}
                          className="rounded-full border border-gold/50 bg-secondary px-3 py-1 text-sm text-gold transition-colors hover:bg-gold hover:text-gold-foreground"
                        >
                          <Highlight text={c.name} query={trimmed} />
                        </Link>
                      ))}
                    </div>
                  )}

                  {trimmed.length >= 2 && results.length > 0 && (
                    <ul role="listbox" className="divide-y divide-border/60">
                      {results.map((product, index) => {
                        const hasDiscount = Boolean(
                          product.discountPrice && product.discountPrice < product.price,
                        );
                        return (
                          <li key={product.id} role="option" aria-selected={index === active}>
                            <Link
                              href={`/products/${product.slug}`}
                              onClick={close}
                              onMouseEnter={() => setActive(index)}
                              style={{ animationDelay: `${index * 40}ms` }}
                              className={cn(
                                'flex animate-fade-in items-center gap-4 px-2 py-3 transition-colors',
                                index === active ? 'bg-secondary' : 'hover:bg-secondary/60',
                              )}
                            >
                              <span className="h-16 w-16 shrink-0 overflow-hidden border border-border bg-muted">
                                {product.images[0] && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={product.images[0]}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">
                                  <Highlight text={product.name} query={trimmed} />
                                </span>
                                <span className="block truncate text-xs uppercase tracking-wide text-muted-foreground">
                                  {[product.categoryName, product.material].filter(Boolean).join(' · ')}
                                </span>
                              </span>
                              <span className="shrink-0 text-right">
                                <span className="block font-serif text-lg">
                                  ₹{hasDiscount ? product.discountPrice : product.price}
                                </span>
                                {hasDiscount && (
                                  <span className="block text-xs text-muted-foreground line-through">
                                    ₹{product.price}
                                  </span>
                                )}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {trimmed.length >= 2 && searched && !loading && results.length === 0 && (
                    <div className="py-10 text-center">
                      <p className="font-serif text-xl">No matches for “{trimmed}”</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Try a different word, or browse a category above.
                      </p>
                    </div>
                  )}
                </div>

                {trimmed.length >= 2 && results.length > 0 && (
                  <button
                    type="button"
                    onClick={goToResults}
                    className="mt-4 flex w-full items-center justify-between border border-gold/40 px-4 py-3 text-sm uppercase tracking-[0.15em] transition-colors hover:bg-gold hover:text-gold-foreground"
                  >
                    <span>See all results for “{trimmed}”</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { BadgeCheck, ImagePlus, Loader2, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_REVIEW_IMAGES, type ProductReviewsResponse, type ReviewResponse } from '@lorka/types';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { optimizedImage } from '@/lib/image';
import { cn } from '@/lib/utils';
import { RatingStars } from '@/components/rating-stars';

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function ProductReviews({
  productId,
  productSlug,
  initial,
}: {
  productId: string;
  productSlug: string;
  initial: ProductReviewsResponse;
}) {
  const [data, setData] = useState(initial);
  const [writing, setWriting] = useState(false);
  const { status, user } = useAuth();
  const { summary, reviews } = data;

  const refresh = async () => {
    const next = await apiClient.get<ProductReviewsResponse>(`/reviews/product/${productId}?limit=20`).catch(() => null);
    if (next) setData(next);
  };

  return (
    <section id="reviews" className="scroll-mt-28 border-t border-border pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-gold">Reviews</p>
          <h2 className="mt-2 text-2xl md:text-3xl">What customers say</h2>
        </div>
        {!writing &&
          !user?.isBlocked &&
          (status === 'authenticated' ? (
            <button
              type="button"
              onClick={() => setWriting(true)}
              className="bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-[0.15em] text-background transition-transform hover:scale-[1.03]"
            >
              Write a review
            </button>
          ) : (
            <Link
              href={`/account/login?redirect=${encodeURIComponent(`/products/${productSlug}#reviews`)}`}
              className="border border-border px-6 py-3 text-xs font-medium uppercase tracking-[0.15em] transition-colors hover:border-gold hover:text-gold"
            >
              Log in to review
            </Link>
          ))}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          {summary.count === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet — be the first to share your thoughts.</p>
          ) : (
            <>
              <div className="flex items-end gap-3">
                <span className="font-serif text-5xl leading-none">{summary.average.toFixed(1)}</span>
                <div className="pb-1">
                  <RatingStars rating={summary.average} className="text-base" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {summary.count} review{summary.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = summary.distribution[star - 1];
                  const pct = summary.count ? (n / summary.count) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-6 text-muted-foreground">{star}★</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                        <span
                          className="block h-full origin-left rounded-full bg-gold-gradient animate-grow-x"
                          style={{ width: `${pct}%`, animationDelay: `${(5 - star) * 80}ms` }}
                        />
                      </span>
                      <span className="w-6 text-right text-muted-foreground">{n}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          {writing && (
            <ReviewForm
              productId={productId}
              onCancel={() => setWriting(false)}
              onDone={async () => {
                setWriting(false);
                await refresh();
              }}
            />
          )}
          {reviews.map((review, i) => (
            <ReviewCard key={review.id} review={review} delay={i * 60} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review, delay }: { review: ReviewResponse; delay: number }) {
  return (
    <article className="border-b border-border pb-6 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <RatingStars rating={review.rating} className="text-sm" />
        {review.title && <p className="font-medium">{review.title}</p>}
      </div>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{review.comment}</p>
      {review.images.length > 0 && (
        <div className="mt-3 flex gap-2">
          {review.images.map((src) => (
            <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={optimizedImage(src, 200)} alt="Customer photo" className="h-full w-full object-cover transition-transform hover:scale-110" />
            </a>
          ))}
        </div>
      )}
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{review.userName}</span>
        {review.verifiedBuyer && (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified buyer
          </span>
        )}
        <span>· {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </p>
    </article>
  );
}

function ReviewForm({
  productId,
  onCancel,
  onDone,
}: {
  productId: string;
  onCancel: () => void;
  onDone: () => Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_REVIEW_IMAGES - images.length;
    const form = new FormData();
    Array.from(files)
      .slice(0, room)
      .forEach((f) => form.append('images', f));
    setUploading(true);
    try {
      const { urls } = await apiClient.upload<{ urls: string[] }>('/reviews/images', form);
      setImages((prev) => [...prev, ...urls].slice(0, MAX_REVIEW_IMAGES));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload photos');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!rating) {
      toast.error('Please choose a star rating');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/reviews/product/${productId}`, { rating, title, comment, images });
      toast.success('Thank you for your review!');
      await onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post your review');
    } finally {
      setSubmitting(false);
    }
  };

  const shown = hover || rating;
  const inputClass =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30';

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gold/30 bg-secondary/30 p-5 animate-scale-in">
      <div>
        <p className="text-sm font-medium">Your rating</p>
        <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              onMouseEnter={() => setHover(star)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-125"
            >
              <Star className={cn('h-7 w-7', star <= shown ? 'fill-gold text-gold' : 'text-gold/40')} strokeWidth={1.4} />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">{RATING_LABELS[shown]}</span>
        </div>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Title (optional)" className={inputClass} />
      <textarea
        required
        minLength={3}
        maxLength={2000}
        rows={4}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How do you like it? How's the finish, size and feel?"
        className={inputClass}
      />
      <div className="flex flex-wrap items-center gap-2">
        {images.map((src) => (
          <span key={src} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={optimizedImage(src, 160)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => setImages((prev) => prev.filter((p) => p !== src))}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {images.length < MAX_REVIEW_IMAGES && (
          <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:border-gold hover:text-gold">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Add photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                void uploadPhotos(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="inline-flex items-center gap-2 bg-foreground px-6 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-background disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Post review
        </button>
        <button type="button" onClick={onCancel} className="px-4 text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </form>
  );
}

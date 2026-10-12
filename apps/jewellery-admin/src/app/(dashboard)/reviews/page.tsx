'use client';

import { useState } from 'react';
import { BadgeCheck, Eye, EyeOff, Loader2, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ReviewResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useReviews, useSetReviewVisible, useDeleteReview } from '@/lib/hooks/reviews';
import { extractMessage } from '@/lib/api-utils';

export default function ReviewsPage() {
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState<'' | 'true' | 'false'>('');
  const { data, isLoading } = useReviews({
    limit: 100,
    search: search || undefined,
    isVisible: visibility === '' ? undefined : visibility === 'true',
  });
  const setVisible = useSetReviewVisible();
  const deleteReview = useDeleteReview();

  const toggle = (review: ReviewResponse) =>
    setVisible.mutate(
      { id: review.id, isVisible: !review.isVisible },
      {
        onSuccess: () => toast.success(review.isVisible ? 'Review hidden from the website' : 'Review is visible again'),
        onError: (err) => toast.error(extractMessage(err, 'Unable to update review')),
      },
    );

  const remove = (review: ReviewResponse) => {
    if (!window.confirm(`Delete this review by ${review.userName}? This cannot be undone.`)) return;
    deleteReview.mutate(review.id, {
      onSuccess: () => toast.success('Review deleted'),
      onError: (err) => toast.error(extractMessage(err, 'Unable to delete review')),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Reviews</h1>
        <p className="mt-1 text-muted-foreground">
          Customer reviews appear on product pages straight away. Hide any that are spam or inappropriate.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name or text…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={visibility} onChange={(e) => setVisibility(e.target.value as '' | 'true' | 'false')} className="max-w-[180px]">
          <option value="">All reviews</option>
          <option value="true">Visible</option>
          <option value="false">Hidden</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-3">
          {data.items.map((review) => (
            <div
              key={review.id}
              className={`rounded-lg border border-border p-4 ${review.isVisible ? '' : 'bg-muted/50 opacity-75'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{review.productName}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                    </span>
                    {review.title && <span className="font-medium">{review.title}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!review.isVisible && <Badge variant="muted">Hidden</Badge>}
                  <Button variant="ghost" size="icon" aria-label={review.isVisible ? 'Hide review' : 'Show review'} onClick={() => toggle(review)}>
                    {review.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Delete review" onClick={() => remove(review)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{review.comment}</p>
              {review.images.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {review.images.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-16 w-16 rounded-md border border-border object-cover" />
                    </a>
                  ))}
                </div>
              )}
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {review.userName}
                {review.verifiedBuyer && (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified buyer
                  </span>
                )}
                · {new Date(review.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No reviews yet.
        </div>
      )}
    </div>
  );
}

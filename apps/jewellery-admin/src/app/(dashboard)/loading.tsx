import { Loader2 } from 'lucide-react';

/** Shown by Next.js while the next page's server data is loading. */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center py-20">
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

import { Search } from 'lucide-react';

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30';

/** Plain GET form — works without JS and re-renders /track-order with the lookup params. */
export function TrackOrderForm({ orderNumber, phone }: { orderNumber?: string; phone?: string }) {
  return (
    <form action="/track-order" method="get" className="space-y-4">
      <div>
        <label htmlFor="orderNumber" className="mb-1.5 block text-xs font-medium uppercase tracking-wide">
          Order number
        </label>
        <input
          id="orderNumber"
          name="orderNumber"
          required
          defaultValue={orderNumber}
          placeholder="e.g. ORD-20261012-A3F9C"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1.5 block text-xs font-medium uppercase tracking-wide">
          Phone number used at checkout
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          defaultValue={phone}
          placeholder="10-digit mobile number"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        className="group inline-flex w-full items-center justify-center gap-2 bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-[0.15em] text-background transition-transform duration-300 hover:scale-[1.02]"
      >
        <Search className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
        Track Order
      </button>
    </form>
  );
}

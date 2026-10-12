'use client';

import { useEffect, useState } from 'react';
import { Ruler, X } from 'lucide-react';

/** Measuring guide for rings and bangles, with a WhatsApp fallback when unsure. */
export function SizeGuide({ kind, whatsappHref }: { kind: 'ring' | 'bangle'; whatsappHref?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const steps =
    kind === 'ring'
      ? [
          {
            title: 'Using a ring you already own',
            body: 'Place a ring that fits you well on a ruler and measure the inside diameter (edge to edge, inside the band) in millimetres.',
          },
          {
            title: 'Using a strip of paper or thread',
            body: 'Wrap it snugly around the base of your finger, mark where it overlaps, and measure that length in millimetres — this is the circumference.',
          },
          {
            title: 'Tips for the right fit',
            body: 'Measure at the end of the day when fingers are largest, and make sure the ring can slide over your knuckle.',
          },
        ]
      : [
          {
            title: 'Using a bangle you already own',
            body: 'Measure the inside diameter of a bangle that fits you comfortably, in millimetres.',
          },
          {
            title: 'Measuring your hand',
            body: 'Bring your thumb and little finger together as if putting on a bangle, then measure around the widest part of your hand with a tape or thread.',
          },
        ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gold underline-offset-4 hover:underline"
      >
        <Ruler className="h-4 w-4" /> {kind === 'ring' ? 'Ring' : 'Bangle'} size guide
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Size guide"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 animate-fade-in sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-background p-6 shadow-xl animate-fade-in-up sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Find your fit</p>
                <h2 className="mt-1 text-2xl">How to measure your {kind} size</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <ol className="mt-6 space-y-5">
              {steps.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-gold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 rounded-xl bg-secondary/60 p-4 text-sm">
              <p className="font-medium">Not sure? We&apos;ll help.</p>
              <p className="mt-1 text-muted-foreground">
                Send us your measurement in millimetres and we&apos;ll tell you the right size — or mention it in the
                order notes at checkout.
              </p>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white"
                >
                  Ask on WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

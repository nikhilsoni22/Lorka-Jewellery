import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSettings } from '@/lib/store';
import { POLICY_PAGES, defaultPolicy, parsePolicy, type PolicySlug } from '@/lib/policies';
import { cn } from '@/lib/utils';

function findPolicy(slug: string) {
  return POLICY_PAGES.find((p) => p.slug === slug);
}

export function generateStaticParams() {
  return POLICY_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const policy = findPolicy((await params).slug);
  return policy ? { title: policy.title, description: policy.description } : {};
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = findPolicy(slug);
  if (!policy) notFound();

  const settings = await getSettings();
  const text = settings.policies[slug as PolicySlug] || defaultPolicy(policy.slug, settings.storeInfo);
  const blocks = parsePolicy(text);

  return (
    <main className="container py-12 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Policies</p>
          <nav className="mt-4 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {POLICY_PAGES.map((p) => (
              <Link
                key={p.slug}
                href={`/policies/${p.slug}`}
                className={cn(
                  'rounded-md px-3 py-2 text-sm transition-colors',
                  p.slug === slug ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:text-gold',
                )}
              >
                {p.title}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="max-w-3xl animate-fade-in-up">
          <h1 className="text-3xl md:text-4xl">{policy.title}</h1>
          <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-foreground/85">
            {blocks.map((block, i) =>
              block.type === 'heading' ? (
                <h2 key={i} className="pt-4 text-xl text-foreground">
                  {block.text}
                </h2>
              ) : block.type === 'list' ? (
                <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-gold">
                  {block.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={i}>{block.text}</p>
              ),
            )}
          </div>
          <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            Questions? <Link href="/contact" className="text-gold underline-offset-4 hover:underline">Contact us</Link>.
          </p>
        </article>
      </div>
    </main>
  );
}

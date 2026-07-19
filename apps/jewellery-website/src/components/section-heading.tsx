export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center">
      {eyebrow && (
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.35em] text-gold">{eyebrow}</p>
      )}
      <h2 className="text-3xl sm:text-4xl">{title}</h2>
      <div className="mt-4 flex items-center justify-center gap-3">
        <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold/60" />
        <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
        <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold/60" />
      </div>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

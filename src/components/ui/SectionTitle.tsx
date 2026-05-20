interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export function SectionTitle({ eyebrow, title, subtitle }: SectionTitleProps) {
  return (
    <div className="space-y-3">
      {eyebrow ? <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">{eyebrow}</p> : null}
      <h2 className="text-4xl leading-[0.95] tracking-tight text-zinc-100 md:text-6xl">{title}</h2>
      {subtitle ? <p className="max-w-2xl text-base leading-relaxed text-zinc-400">{subtitle}</p> : null}
    </div>
  );
}

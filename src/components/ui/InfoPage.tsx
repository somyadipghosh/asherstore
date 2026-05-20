import Link from "next/link";

interface InfoSection {
  title: string;
  points: string[];
}

interface InfoPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  sections: InfoSection[];
  primaryCta: {
    label: string;
    href: string;
  };
}

export function InfoPage({ eyebrow, title, intro, sections, primaryCta }: InfoPageProps) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">
      <article className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-rose-400">{eyebrow}</p>
        <h1 className="mt-3 text-3xl text-zinc-100 md:text-4xl">{title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300 md:text-base">{intro}</p>

        <div className="mt-8 space-y-7">
          {sections.map((section) => (
            <section key={section.title} aria-labelledby={section.title.replace(/\s+/g, "-").toLowerCase()}>
              <h2
                id={section.title.replace(/\s+/g, "-").toLowerCase()}
                className="text-xl text-zinc-100 md:text-2xl"
              >
                {section.title}
              </h2>
              {section.points.length ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-300 md:text-base">
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className="mt-9 border-t border-white/10 pt-5">
          <Link
            href={primaryCta.href}
            className="inline-flex rounded-lg border border-rose-400/50 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:border-rose-300 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            {primaryCta.label}
          </Link>
        </div>
      </article>
    </main>
  );
}
import type { ReactNode } from "react";

/** Conteúdo legal (termos / privacidade) — tipografia BN. */
export function LegalDoc({
  eyebrow,
  title,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[20rem] bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(59,130,246,0.14),transparent_70%)]"
      />
      <article className="relative mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20">
        <span className="mb-3 block text-[11px] font-bold tracking-[0.1em] text-[var(--bn-primary)] uppercase sm:text-[12px]">
          {eyebrow}
        </span>
        <h1 className="font-brand-headline text-3xl font-bold tracking-tight text-[var(--bn-on)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--bn-muted)]">
          Última atualização: {updatedAt}
        </p>
        <div className="legal-prose mt-10 space-y-6 text-[15px] leading-relaxed text-[var(--bn-on-variant)] [&_h2]:mt-10 [&_h2]:font-brand-headline [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--bn-on)] [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[var(--bn-on)] [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:text-[var(--bn-primary)] [&_a]:underline-offset-2 hover:[&_a]:underline">
          {children}
        </div>
        <p className="mt-12 rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface)] px-4 py-3 text-xs leading-relaxed text-[var(--bn-muted)]">
          Este texto é um modelo operacional para a plataforma Barbernegon.
          Recomendamos revisão por advogado(a) antes de uso comercial em escala.
        </p>
      </article>
    </div>
  );
}

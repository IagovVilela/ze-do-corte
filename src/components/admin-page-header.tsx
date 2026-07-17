import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  /** Alias de description (compatível com SectionTitle). */
  subtitle?: string;
  className?: string;
};

/**
 * Cabeçalho de página do painel — Montserrat + tokens BN (sem Bebas).
 */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  subtitle,
  className,
}: Props) {
  const content = description ?? subtitle;

  return (
    <div className={cn(className)}>
      {eyebrow ? (
        <span className="mb-2 block text-[11px] font-bold tracking-[0.1em] text-[var(--bn-primary)] uppercase sm:text-[12px]">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="font-brand-headline text-2xl font-bold tracking-tight text-[var(--bn-on)] sm:text-3xl">
        {title}
      </h1>
      {content ? (
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--bn-on-variant)]">
          {content}
        </p>
      ) : null}
    </div>
  );
}

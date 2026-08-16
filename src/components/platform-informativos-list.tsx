import Link from "next/link";

import { PLATFORM_CONDITION_DOCS } from "@/lib/platform-informativos";

export function PlatformInformativosList({
  tone = "admin",
}: {
  tone?: "admin" | "public";
}) {
  const card =
    tone === "public"
      ? "rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-5"
      : "rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 p-5";

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {PLATFORM_CONDITION_DOCS.map((doc) => {
        const isPdf = doc.kind === "pdf";
        return (
          <li key={doc.id} className={card}>
            <p className="text-[11px] font-bold tracking-[0.12em] text-[var(--bn-primary)] uppercase">
              {isPdf ? "PDF" : "Página"}
            </p>
            <h3 className="mt-2 font-display text-base text-[var(--bn-on)]">
              {doc.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--bn-muted)]">
              {doc.summary}
            </p>
            <Link
              href={doc.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-[var(--bn-primary)] underline-offset-2 hover:underline"
            >
              {isPdf ? "Abrir PDF" : "Ler agora"}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

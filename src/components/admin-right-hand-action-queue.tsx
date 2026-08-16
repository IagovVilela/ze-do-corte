import Link from "next/link";

import type { RightHandAction } from "@/lib/admin-right-hand-types";
import { formatMoney } from "@/lib/utils";

type Props = {
  actions: RightHandAction[];
};

export function AdminRightHandActionQueue({ actions }: Props) {
  if (actions.length === 0) return null;
  return (
    <div
      id="fila-acoes"
      className="scroll-mt-24 rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-5"
    >
      <h3 className="text-sm font-semibold text-[var(--bn-on)]">
        To-do do dia (por impacto)
      </h3>
      <p className="mt-1 text-xs text-[var(--bn-muted)]">
        Lista única ordenada pelo impacto financeiro estimado.
      </p>
      <ol className="mt-4 space-y-3">
        {actions.map((a) => (
          <li
            key={a.id}
            className="flex flex-col gap-1 rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)]/50 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--bn-on)]">
                <span className="mr-2 text-[var(--bn-muted)]">{a.rank}.</span>
                {a.title}
              </p>
              <p className="mt-0.5 text-xs text-[var(--bn-muted)]">{a.detail}</p>
              {a.estimatedImpactBrl != null ? (
                <p className="mt-1 text-[11px] font-medium text-[var(--bn-rh-positive)]">
                  ~{formatMoney(a.estimatedImpactBrl)}
                  {a.impactBasis ? ` · ${a.impactBasis}` : ""}
                </p>
              ) : null}
            </div>
            <Link
              href={a.href}
              className="shrink-0 text-xs font-semibold text-[var(--bn-primary)] hover:underline"
            >
              Abrir →
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

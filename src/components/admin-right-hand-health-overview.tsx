import Link from "next/link";

import type {
  RightHandHealth,
  RightHandHealthTone,
} from "@/lib/admin-right-hand-types";
import { confidenceLabel } from "@/lib/right-hand-confidence";
import { cn } from "@/lib/utils";

type Props = {
  health: RightHandHealth;
};

function ToneDot({ tone }: { tone: RightHandHealthTone }) {
  const label =
    tone === "green" ? "Verde" : tone === "yellow" ? "Amarelo" : "Vermelho";
  return (
    <span
      role="img"
      aria-label={`Status ${label}`}
      title={label}
      className={cn(
        "inline-block size-4 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-[var(--bn-surface-elevated)]",
        tone === "green" &&
          "bg-[var(--bn-rh-positive)] ring-[var(--bn-rh-positive)]/40",
        tone === "yellow" && "bg-[var(--bn-status-warn)] ring-amber-400/50",
        tone === "red" &&
          "bg-[var(--bn-rh-danger)] ring-[var(--bn-rh-danger)]/40",
      )}
    />
  );
}

const LABELS = {
  finance: "Saúde financeira",
  retention: "Retenção de clientes",
  occupancy: "Ocupação / demanda",
} as const;

export function AdminRightHandHealthOverview({ health }: Props) {
  const items = [
    { key: "finance" as const, item: health.finance },
    { key: "retention" as const, item: health.retention },
    { key: "occupancy" as const, item: health.occupancy },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map(({ key, item }) => {
        const badge = confidenceLabel(item.confidence);
        return (
          <div
            key={key}
            className={cn(
              "rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-5",
              item.confidence === "indicative" && "opacity-70",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <ToneDot tone={item.tone} />
              <p className="text-sm font-semibold text-[var(--bn-on)]">
                {LABELS[key]}
              </p>
              {badge ? (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-200 uppercase">
                  {badge}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-xl font-semibold tracking-tight text-[var(--bn-on)]">
              {item.metric}
            </p>
            <p className="mt-1 text-xs font-medium text-[var(--bn-muted)]">
              {item.variation}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--bn-on-variant)]">
              {item.detail}
            </p>
            <Link
              href={item.href}
              className="mt-3 inline-block text-xs font-semibold text-[var(--bn-primary)] hover:underline"
            >
              Ver detalhe →
            </Link>
          </div>
        );
      })}
    </div>
  );
}

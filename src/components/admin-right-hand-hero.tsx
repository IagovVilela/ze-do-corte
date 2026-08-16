"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { AdminRightHandFunnel } from "@/components/admin-right-hand-funnel";
import { DashboardRevenueLine } from "@/components/dashboard-revenue-line";
import type { RightHandAction, RightHandSnapshot } from "@/lib/admin-right-hand-types";
import { formatMoney } from "@/lib/utils";

type Props = {
  snapshot: RightHandSnapshot;
  topAction: RightHandAction | null;
};

export function AdminRightHandHero({ snapshot, topAction }: Props) {
  const proof = topAction?.proofChart ?? null;
  const highlightPaid =
    proof === "funnel" &&
    snapshot.funnel.completed > 0 &&
    snapshot.funnel.paid < snapshot.funnel.completed;

  return (
    <div className="rounded-2xl border-2 border-[var(--bn-rh-danger)]/50 bg-[var(--bn-rh-danger)]/10 p-4 sm:p-6 shadow-[0_0_32px_-12px_rgba(248,113,113,0.45)]">
      <p className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-[var(--bn-rh-danger)] uppercase">
        <AlertTriangle className="size-3.5" aria-hidden />
        Faça agora
      </p>
      {topAction ? (
        <>
          <h2 className="mt-2 text-xl font-semibold text-[var(--bn-on)] sm:text-2xl">
            {topAction.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--bn-muted)]">{topAction.detail}</p>
          {topAction.estimatedImpactBrl != null ? (
            <p className="mt-2 text-sm font-semibold text-[var(--bn-rh-positive)]">
              Impacto estimado ~{formatMoney(topAction.estimatedImpactBrl)}
            </p>
          ) : null}
          <Link
            href={topAction.href}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--bn-primary)] hover:underline"
          >
            Ir para a ação
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--bn-muted)]">
          Sem urgência crítica — explore os gráficos abaixo.
        </p>
      )}

      <div className="mt-5">
        {proof === "funnel" || highlightPaid ? (
          <AdminRightHandFunnel
            funnel={snapshot.funnel}
            periodLabel={snapshot.periodLabel}
            confidence={snapshot.confidence.funnel}
            highlightStage={highlightPaid ? "paid" : "completed"}
            callout={
              highlightPaid
                ? "Aqui a operação está travando: concluído sem virar pagamento."
                : undefined
            }
            compact
          />
        ) : proof === "revenue" ? (
          <DashboardRevenueLine
            data={snapshot.revenueSeries}
            periodLabel={snapshot.periodLabel}
            peakIndex={snapshot.peakValley.peakIndex}
            valleyIndex={snapshot.peakValley.valleyIndex}
            compact
          />
        ) : proof === "retention" && snapshot.retentionQueue[0] ? (
          <div className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface)]/80 p-3 text-sm">
            <p className="font-medium text-[var(--bn-on)]">
              {snapshot.retentionQueue[0].name}
            </p>
            <p className="text-xs text-[var(--bn-muted)]">
              {snapshot.retentionQueue[0].risk === "lost" ? "Sumindo" : "Em risco"}
              {snapshot.retentionQueue[0].totalSpent != null
                ? ` · ${formatMoney(snapshot.retentionQueue[0].totalSpent)} histórico`
                : ""}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

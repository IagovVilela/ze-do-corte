"use client";

import Link from "next/link";

import { AdminWhatsAppDraftButton } from "@/components/admin-whatsapp-draft-button";
import type { RightHandRetentionClient } from "@/lib/admin-right-hand-types";
import { formatMoney } from "@/lib/utils";

type Props = {
  clients: RightHandRetentionClient[];
};

export function AdminRightHandRetention({ clients }: Props) {
  const historicSpend = clients.reduce(
    (s, c) => s + (c.totalSpent ?? 0),
    0,
  );

  if (clients.length === 0) {
    return (
      <div
        id="reativacao"
        className="scroll-mt-24 rounded-2xl border border-dashed border-[var(--bn-border)] bg-[var(--bn-surface)] p-5 text-sm text-[var(--bn-muted)]"
      >
        Nenhum cliente em risco na fila agora.{" "}
        <Link
          href="/admin/clientes"
          className="font-semibold text-[var(--bn-primary)] hover:underline"
        >
          Ver CRM
        </Link>
      </div>
    );
  }

  return (
    <div
      id="reativacao"
      className="scroll-mt-24 rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--bn-on)]">
            Reativação sugerida
          </h3>
          <p className="mt-1 text-xs text-[var(--bn-muted)]">
            {clients.length} cliente{clients.length === 1 ? "" : "s"} em risco /
            sumindo
            {historicSpend > 0
              ? ` · ~${formatMoney(historicSpend)} em receita histórica nesta fila`
              : ""}
            . Gere a mensagem e abra o WhatsApp.
          </p>
        </div>
        <Link
          href="/admin/clientes?risk=actionable"
          className="text-xs font-semibold text-[var(--bn-primary)] hover:underline"
        >
          Ver fila completa →
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {clients.map((c) => (
          <li
            key={c.phoneKey}
            className="flex flex-col gap-2 rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)]/40 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--bn-on)]">
                {c.name}
              </p>
              <p className="text-[11px] text-[var(--bn-muted)]">
                {c.risk === "lost" ? "Sumindo" : "Em risco"}
                {c.daysSinceLastActivity != null
                  ? ` · ${c.daysSinceLastActivity}d`
                  : ""}
                {c.lastServiceName ? ` · ${c.lastServiceName}` : ""}
                {c.clubPlanName ? ` · clube ${c.clubPlanName}` : ""}
                {c.totalSpent != null
                  ? ` · ${formatMoney(c.totalSpent)} histórico`
                  : ""}
              </p>
            </div>
            <AdminWhatsAppDraftButton
              kind={
                c.clubPlanName && c.risk === "lost"
                  ? "club_churn"
                  : c.clubPlanName
                    ? "club_underuse"
                    : "winback"
              }
              clientName={c.name}
              phone={c.phone}
              daysSinceLastActivity={c.daysSinceLastActivity}
              planName={c.clubPlanName}
              lastServiceHint={c.lastServiceName}
              label="Mensagem IA"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

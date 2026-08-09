import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { AdminOpsUnpaidList } from "@/components/admin-ops-unpaid-list";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AnimatedSection } from "@/components/animated-section";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { getAdminOpsSnapshot } from "@/lib/admin-ops";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AdminOperacionalPage() {
  const access = await getStaffAccessOrNull();
  if (!access) return null;

  const snap = await getAdminOpsSnapshot(access);

  const card =
    "rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-4";

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Operação"
            title="Operacional"
            description="O que precisa de atenção agora — filas curtas e ações claras."
          />

          {snap.lostClientsCount > 0 ? (
            <Link
              href="/admin/clientes?risk=lost"
              className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--bn-status-danger)]/30 bg-[var(--bn-status-danger)]/10 px-4 py-3 text-sm transition hover:bg-[var(--bn-status-danger)]/15"
            >
              <span className="font-medium text-[var(--bn-on)]">
                {snap.lostClientsCount} cliente
                {snap.lostClientsCount === 1 ? "" : "s"} sumindo (60+ dias)
              </span>
              <span className="text-xs font-semibold text-[var(--bn-status-danger)]">
                Abrir CRM →
              </span>
            </Link>
          ) : null}

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Confirmados hoje",
                value: String(snap.kpis.todayConfirmed),
              },
              {
                label: "Próximas 2 horas",
                value: String(snap.kpis.nextTwoHours),
              },
              {
                label: "A receber",
                value: String(snap.kpis.unpaidCompleted),
              },
              {
                label: "Clube em atraso",
                value: String(snap.kpis.clubPastDue),
              },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-4"
              >
                <p className="text-xs text-[var(--bn-muted)]">{c.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--bn-on)]">
                  {c.value}
                </p>
              </div>
            ))}
          </div>

          {snap.monthOrigins.length > 0 ? (
            <p className="mt-4 text-sm text-[var(--bn-muted)]">
              Origem no mês:{" "}
              {snap.monthOrigins
                .map((o) => `${o.label} ${o.percent}%`)
                .join(" · ")}
            </p>
          ) : null}

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <section className={card}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--bn-on)]">
                  Agenda de hoje
                </h2>
                <Link
                  href="/admin/agendamentos"
                  className="text-xs font-medium text-[var(--bn-primary)] hover:underline"
                >
                  Ver calendário
                </Link>
              </div>
              {snap.todayAgenda.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--bn-muted)]">
                  Sem horários confirmados restantes.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-[var(--bn-border)]">
                  {snap.todayAgenda.map((a) => (
                    <li key={a.id} className="py-2 text-sm">
                      <p className="font-medium text-[var(--bn-on)]">
                        {format(new Date(a.startsAt), "HH:mm", { locale: ptBR })}{" "}
                        · {a.clientName}
                      </p>
                      <p className="text-xs text-[var(--bn-muted)]">
                        {a.serviceName}
                        {a.staffLabel ? ` · ${a.staffLabel}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section id="a-receber" className={`${card} scroll-mt-24`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--bn-on)]">
                  A receber
                </h2>
                <Link
                  href="/admin/caixa"
                  className="text-xs font-medium text-[var(--bn-primary)] hover:underline"
                >
                  Caixa
                </Link>
              </div>
              <AdminOpsUnpaidList
                unpaid={snap.unpaid}
                canManagePayment={access.permissions.viewRevenue}
              />
            </section>

            <section className={card}>
              <h2 className="text-sm font-semibold text-[var(--bn-on)]">
                Clientes que mais voltam (mês)
              </h2>
              {snap.topClients.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--bn-muted)]">Sem dados.</p>
              ) : (
                <ul className="mt-3 divide-y divide-[var(--bn-border)]">
                  {snap.topClients.map((c) => (
                    <li
                      key={c.phone}
                      className="flex justify-between gap-2 py-2 text-sm"
                    >
                      <span className="text-[var(--bn-on)]">{c.name}</span>
                      <span className="text-[var(--bn-muted)]">
                        {c.visits}× · {money(c.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={card}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--bn-on)]">
                  Atenção clube
                </h2>
                <Link
                  href="/admin/clube"
                  className="text-xs font-medium text-[var(--bn-primary)] hover:underline"
                >
                  Abrir clube
                </Link>
              </div>
              {snap.clubAttention.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--bn-muted)]">
                  Nenhuma assinatura em atenção.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-[var(--bn-border)]">
                  {snap.clubAttention.map((c) => (
                    <li key={c.id} className="py-2 text-sm">
                      <p className="font-medium text-[var(--bn-on)]">
                        {c.clientName}
                      </p>
                      <p className="text-xs text-[var(--bn-muted)]">
                        {c.planName} · {c.status}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {snap.lowStock.length > 0 ? (
                <div className="mt-4 border-t border-[var(--bn-border)] pt-3">
                  <p className="text-xs font-semibold text-amber-200">
                    Estoque baixo
                  </p>
                  <ul className="mt-1 text-xs text-[var(--bn-muted)]">
                    {snap.lowStock.map((p) => (
                      <li key={p.id}>
                        {p.name}: {p.stockQty}
                        {p.stockMin != null ? ` (mín. ${p.stockMin})` : ""}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/admin/produtos"
                    className="mt-2 inline-block text-xs text-[var(--bn-primary)] hover:underline"
                  >
                    Produtos
                  </Link>
                </div>
              ) : null}
            </section>
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}

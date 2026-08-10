import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminAppointmentFrequencyHeatmap } from "@/components/admin-appointment-frequency-heatmap";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminRightHandCompareBars } from "@/components/admin-right-hand-compare-bars";
import { AdminRightHandInsights } from "@/components/admin-right-hand-insights";
import { AdminRightHandRetention } from "@/components/admin-right-hand-retention";
import { AnimatedSection } from "@/components/animated-section";
import { DashboardRevenueLine } from "@/components/dashboard-revenue-line";
import { DashboardServicesBarChart } from "@/components/dashboard-services-bar-chart";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { getRightHandSnapshot } from "@/lib/admin-right-hand";
import {
  parseDashboardRange,
  type DashboardRange,
} from "@/lib/dashboard-period";
import { prisma } from "@/lib/prisma";
import { unitScopeWhere } from "@/lib/staff-access";
import { cn, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const RANGE_OPTS: { range: DashboardRange; label: string }[] = [
  { range: "day", label: "Hoje" },
  { range: "7d", label: "7 dias" },
  { range: "month", label: "Mês" },
  { range: "3m", label: "3 meses" },
];

export default async function AdminInteligenciaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const access = await getStaffAccessOrNull();
  if (!access) return null;

  if (
    (access.role !== "OWNER" && access.role !== "ADMIN") ||
    !access.permissions.viewRevenue
  ) {
    redirect("/admin");
  }

  const sp = await searchParams;
  const chartRange = parseDashboardRange(
    typeof sp.chartRange === "string" ? sp.chartRange : undefined,
  );

  const [snapshot, units, staff] = await Promise.all([
    getRightHandSnapshot(access, chartRange),
    prisma.barbershopUnit.findMany({
      where: { isActive: true, ...unitScopeWhere(access) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.staffMember.findMany({
      where: {
        organizationId: access.organizationId,
        role: { in: ["STAFF", "ADMIN", "OWNER"] },
      },
      select: { id: true, displayName: true, email: true },
      orderBy: [{ displayName: "asc" }, { email: "asc" }],
    }),
  ]);

  if (!snapshot) {
    redirect("/admin");
  }

  const staffOptions = staff.map((s) => ({
    id: s.id,
    label: s.displayName?.trim() || s.email,
  }));

  const k = snapshot.kpis;

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Braço Direito"
            title="Análise da operação"
            description={`${snapshot.periodLabel} · comparativo vs ${snapshot.previousPeriodLabel}`}
          />

          <div className="mt-6">
            <AdminRightHandInsights chartRange={chartRange} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {RANGE_OPTS.map((o) => {
              const href =
                o.range === "month"
                  ? "/admin/inteligencia"
                  : `/admin/inteligencia?chartRange=${o.range}`;
              const active = chartRange === o.range;
              return (
                <Link
                  key={o.range}
                  href={href}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition",
                    active
                      ? "bg-[var(--bn-primary)] text-zinc-950"
                      : "border border-[var(--bn-border)] text-[var(--bn-on-variant)] hover:bg-[var(--bn-hover)]",
                  )}
                >
                  {o.label}
                </Link>
              );
            })}
          </div>

          {snapshot.maturityMessage ? (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-[var(--bn-on)]">
              {snapshot.maturityMessage}
            </p>
          ) : null}

          {snapshot.empty ? (
            <div className="mt-8 rounded-2xl border border-dashed border-[var(--bn-border)] bg-[var(--bn-surface)] p-8 text-center">
              <p className="text-base font-semibold text-[var(--bn-on)]">
                Nenhum agendamento ainda neste período
              </p>
              <p className="mt-2 text-sm text-[var(--bn-muted)]">
                Compartilhe o link da agenda ou importe clientes no CRM para
                começar a coletar dados.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {snapshot.publicBookingPath ? (
                  <Link
                    href={snapshot.publicBookingPath}
                    className="rounded-full bg-[var(--bn-primary)] px-4 py-2 text-sm font-semibold text-zinc-950"
                  >
                    Abrir link de agendar
                  </Link>
                ) : null}
                <Link
                  href="/admin/clientes"
                  className="rounded-full border border-[var(--bn-border)] px-4 py-2 text-sm font-semibold text-[var(--bn-on)]"
                >
                  Ir ao CRM
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Receita", value: formatMoney(k.revenue) },
                  {
                    label: "Atendimentos",
                    value: String(k.appointments),
                  },
                  { label: "Ticket médio", value: formatMoney(k.avgTicket) },
                  {
                    label: "Cancelamentos",
                    value: `${k.cancelRate}%`,
                  },
                  {
                    label: "Novos no período",
                    value: String(k.newClients),
                  },
                  {
                    label: "Recorrentes",
                    value: String(k.recurringClients),
                  },
                  {
                    label: "Em risco / sumindo",
                    value: `${k.atRiskClients} / ${k.lostClients}`,
                  },
                  {
                    label: "LTV estimado",
                    value:
                      k.estimatedLtv != null
                        ? formatMoney(k.estimatedLtv)
                        : "—",
                  },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-4"
                  >
                    <p className="text-xs text-[var(--bn-muted)]">{c.label}</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--bn-on)]">
                      {c.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                <AdminRightHandCompareBars
                  metrics={snapshot.compare}
                  currentLabel={snapshot.periodLabel}
                  previousLabel={snapshot.previousPeriodLabel}
                  showDelta={snapshot.maturity !== "insufficient"}
                />
                <DashboardRevenueLine
                  data={snapshot.revenueSeries}
                  periodLabel={snapshot.periodLabel}
                />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <DashboardServicesBarChart
                  data={snapshot.services}
                  periodLabel={snapshot.periodLabel}
                />
                <div className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-5">
                  <h3 className="text-sm font-semibold text-[var(--bn-on)]">
                    Equipe no período
                  </h3>
                  {snapshot.staffRanking.length === 0 ? (
                    <p className="mt-3 text-sm text-[var(--bn-muted)]">
                      Sem dados de profissionais.
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y divide-[var(--bn-border)]">
                      {snapshot.staffRanking.slice(0, 8).map((s) => (
                        <li
                          key={s.label}
                          className="flex justify-between gap-2 py-2 text-sm"
                        >
                          <span className="text-[var(--bn-on)]">{s.label}</span>
                          <span className="text-[var(--bn-muted)]">
                            {s.completed} ok · {formatMoney(s.received)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <AdminRightHandRetention clients={snapshot.retentionQueue} />
              </div>

              {snapshot.facts.weakHeatHint ? (
                <div
                  id="demanda-fraca"
                  className="scroll-mt-24 mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"
                >
                  <p className="text-xs font-bold tracking-wide text-amber-200 uppercase">
                    Horário fraco (padrão estimado)
                  </p>
                  <p className="mt-1 text-sm text-[var(--bn-on)]">
                    {snapshot.facts.weakHeatHint}
                  </p>
                  <p className="mt-1 text-xs text-[var(--bn-muted)]">
                    Use para promoção de horário vago ou realocar profissional.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link
                      href="/admin/agendamentos"
                      className="text-xs font-semibold text-[var(--bn-primary)] hover:underline"
                    >
                      Abrir agenda →
                    </Link>
                    <Link
                      href="/admin/whatsapp"
                      className="text-xs font-semibold text-[var(--bn-primary)] hover:underline"
                    >
                      Configurar WhatsApp →
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className="mt-8">
                <p className="mb-2 text-xs text-[var(--bn-muted)]">
                  Mapa de demanda (estimativa weekday × hora — não é taxa de
                  ocupação de slots).
                </p>
                <AdminAppointmentFrequencyHeatmap
                  units={units}
                  staffOptions={staffOptions}
                />
              </div>
            </>
          )}
        </AnimatedSection>
      </section>
    </main>
  );
}

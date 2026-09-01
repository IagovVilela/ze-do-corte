import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminAppointmentFrequencyHeatmap } from "@/components/admin-appointment-frequency-heatmap";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminRightHandActionQueue } from "@/components/admin-right-hand-action-queue";
import { AdminRightHandChat } from "@/components/admin-right-hand-chat";
import { AdminRightHandCohort } from "@/components/admin-right-hand-cohort";
import { AdminRightHandFunnel } from "@/components/admin-right-hand-funnel";
import { AdminRightHandHealthOverview } from "@/components/admin-right-hand-health-overview";
import { AdminRightHandHero } from "@/components/admin-right-hand-hero";
import { FinanceGerencialAlerts } from "@/components/finance-gerencial-alerts";
import { AdminRightHandInsights } from "@/components/admin-right-hand-insights";
import { AdminRightHandRetention } from "@/components/admin-right-hand-retention";
import { AdminRightHandServicesPie } from "@/components/admin-right-hand-services-pie";
import { AnimatedSection } from "@/components/animated-section";
import { DashboardRevenueLine } from "@/components/dashboard-revenue-line";
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
  const view = sp.view === "analise" ? "analise" : "geral";

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
  const topAction = snapshot.actionQueue[0] ?? null;
  const cohort30 = snapshot.cohorts.find((c) => c.windowDays === 30);
  const cohortSummary =
    !snapshot.confidence.showCohortChart && cohort30
      ? `Coorte 30d (indicativo): ${cohort30.ratePercent}% voltaram (${cohort30.returned}/${cohort30.eligible}) — amostra ainda pequena.`
      : null;

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Braço Direito"
            title="Análise da operação"
            description={`${snapshot.periodLabel} · vs ${snapshot.previousPeriodLabel}`}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={
                chartRange === "month"
                  ? "/admin/inteligencia?view=geral"
                  : `/admin/inteligencia?view=geral&chartRange=${chartRange}`
              }
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition",
                view === "geral"
                  ? "bg-[var(--bn-primary)] text-zinc-950"
                  : "border border-[var(--bn-border)] text-[var(--bn-on-variant)] hover:bg-[var(--bn-hover)]",
              )}
            >
              Visão geral
            </Link>
            <Link
              href={
                chartRange === "month"
                  ? "/admin/inteligencia?view=analise"
                  : `/admin/inteligencia?view=analise&chartRange=${chartRange}`
              }
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition",
                view === "analise"
                  ? "bg-[var(--bn-primary)] text-zinc-950"
                  : "border border-[var(--bn-border)] text-[var(--bn-on-variant)] hover:bg-[var(--bn-hover)]",
              )}
            >
              Análise detalhada
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {RANGE_OPTS.map((o) => {
              const href =
                o.range === "month"
                  ? `/admin/inteligencia?view=${view}`
                  : `/admin/inteligencia?view=${view}&chartRange=${o.range}`;
              const active = chartRange === o.range;
              return (
                <Link
                  key={o.range}
                  href={href}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    active
                      ? "bg-[var(--bn-primary)]/30 text-[var(--bn-on)] ring-1 ring-[var(--bn-primary)]"
                      : "border border-[var(--bn-border)] text-[var(--bn-muted)] hover:bg-[var(--bn-hover)]",
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

          {view === "geral" ? (
            <div className="mt-8 space-y-6">
              <p className="text-sm text-[var(--bn-muted)]">
                Leitura de 5 segundos — toque em Ver detalhe para aprofundar.
              </p>
              <AdminRightHandHealthOverview health={snapshot.health} />
              {topAction ? (
                <div className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-5">
                  <p className="text-xs font-bold tracking-wide text-[var(--bn-muted)] uppercase">
                    Prioridade #1
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--bn-on)]">
                    {topAction.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--bn-muted)]">
                    {topAction.detail}
                  </p>
                  <Link
                    href={`/admin/inteligencia?view=analise${chartRange === "month" ? "" : `&chartRange=${chartRange}`}`}
                    className="mt-3 inline-block text-xs font-semibold text-[var(--bn-primary)] hover:underline"
                  >
                    Abrir análise detalhada →
                  </Link>
                </div>
              ) : null}
            </div>
          ) : snapshot.empty ? (
            <div className="mt-8 rounded-2xl border border-dashed border-[var(--bn-border)] bg-[var(--bn-surface)] p-8 text-center">
              <p className="text-base font-semibold text-[var(--bn-on)]">
                Nenhum agendamento ainda neste período
              </p>
              <p className="mt-2 text-sm text-[var(--bn-muted)]">
                Compartilhe o link da agenda para começar a coletar dados.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-8">
                <AdminRightHandHero
                  snapshot={snapshot}
                  topAction={topAction}
                />
              </div>

              {access.permissions.viewRevenue ? (
                <div className="mt-6">
                  <FinanceGerencialAlerts />
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: "Receita (pagos)",
                    value: formatMoney(k.revenue),
                    hint: `${k.paidCount} pagamento(s)`,
                  },
                  {
                    label: "Atendimentos",
                    value: String(k.appointments),
                    hint: k.appointmentsHint,
                  },
                  {
                    label: "Em risco / sumindo",
                    value: `${k.atRiskClients} / ${k.lostClients}`,
                    hint:
                      k.estimatedLtv != null
                        ? `LTV histórico médio ${formatMoney(k.estimatedLtv)}`
                        : "Retenção",
                  },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-5"
                  >
                    <p className="text-xs text-[var(--bn-muted)]">{c.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--bn-on)]">
                      {c.value}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--bn-muted)]">
                      {c.hint}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <AdminRightHandActionQueue actions={snapshot.actionQueue} />
              </div>

              <div className="mt-6">
                <AdminRightHandInsights chartRange={chartRange} />
              </div>

              <div className="mt-4">
                <AdminRightHandChat chartRange={chartRange} />
              </div>

              <div className="mt-8">
                <p className="mb-2 text-xs text-[var(--bn-muted)]">
                  Mapa de demanda — quando estou ocioso?
                </p>
                <AdminAppointmentFrequencyHeatmap
                  units={units}
                  staffOptions={staffOptions}
                  chartRange={chartRange}
                  forceConfidence={snapshot.confidence.volume}
                />
              </div>

              {snapshot.facts.weakHeatHint || snapshot.promoSuggestion ? (
                <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-xs font-bold tracking-wide text-amber-200 uppercase">
                    Horário fraco · campanha
                  </p>
                  {snapshot.facts.weakHeatHint ? (
                    <p className="mt-1 text-sm text-[var(--bn-on)]">
                      {snapshot.facts.weakHeatHint}
                    </p>
                  ) : null}
                  {snapshot.promoSuggestion ? (
                    <p className="mt-2 text-xs whitespace-pre-wrap text-[var(--bn-on-variant)]">
                      {snapshot.promoSuggestion.copyText}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {snapshot.prediction &&
              snapshot.confidence.prediction === "indicative" ? (
                <p className="mt-4 text-xs text-[var(--bn-muted)] opacity-70">
                  Previsão: {snapshot.prediction.detail}
                </p>
              ) : snapshot.prediction &&
                snapshot.confidence.prediction === "conclusive" ? (
                <p className="mt-4 rounded-xl border border-[var(--bn-rh-info)]/30 bg-[var(--bn-rh-info)]/10 px-4 py-3 text-sm text-[var(--bn-on)]">
                  {snapshot.prediction.detail}
                </p>
              ) : null}

              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                <DashboardRevenueLine
                  data={snapshot.revenueSeries}
                  periodLabel={snapshot.periodLabel}
                  previousPeriodLabel={snapshot.previousPeriodLabel}
                  peakIndex={snapshot.peakValley.peakIndex}
                  valleyIndex={snapshot.peakValley.valleyIndex}
                  confidence={snapshot.confidence.volume}
                  compareMetrics={snapshot.compare}
                />
                <AdminRightHandFunnel
                  funnel={snapshot.funnel}
                  periodLabel={snapshot.periodLabel}
                  confidence={
                    snapshot.confidence.volume === "indicative" ||
                    snapshot.confidence.funnel === "indicative"
                      ? "indicative"
                      : "conclusive"
                  }
                  highlightStage={
                    snapshot.funnel.completed > snapshot.funnel.paid
                      ? "paid"
                      : undefined
                  }
                  callout={
                    snapshot.funnel.completed > snapshot.funnel.paid
                      ? "Gap concluído → pago"
                      : undefined
                  }
                />
              </div>

              <div className="mt-4">
                <AdminRightHandServicesPie
                  data={snapshot.services}
                  periodLabel={snapshot.periodLabel}
                />
              </div>

              {snapshot.confidence.showCohortChart ? (
                <div className="mt-4">
                  <AdminRightHandCohort
                    cohorts={snapshot.cohorts}
                    confidence={snapshot.confidence.cohort}
                  />
                </div>
              ) : null}

              <div className="mt-4 rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-5">
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

              <div className="mt-8">
                <AdminRightHandRetention
                  clients={snapshot.retentionQueue}
                  cohortSummary={cohortSummary}
                />
              </div>
            </>
          )}
        </AnimatedSection>
      </section>
    </main>
  );
}

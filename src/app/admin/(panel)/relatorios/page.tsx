import Link from "next/link";

import { AdminAppointmentFrequencyHeatmap } from "@/components/admin-appointment-frequency-heatmap";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminReportsPeriodAi } from "@/components/admin-reports-period-ai";
import { AnimatedSection } from "@/components/animated-section";
import { DashboardPaymentStack } from "@/components/dashboard-payment-stack";
import { DashboardRevenueLine } from "@/components/dashboard-revenue-line";
import { DashboardServicesBarChart } from "@/components/dashboard-services-bar-chart";
import { DashboardStatusPie } from "@/components/dashboard-status-pie";
import { DashboardSummaryTable } from "@/components/dashboard-summary-table";
import { DashboardVolumeArea } from "@/components/dashboard-volume-area";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { getAdminReportsSnapshot } from "@/lib/admin-reports";
import {
  parseDashboardRange,
  type DashboardRange,
} from "@/lib/dashboard-period";
import { prisma } from "@/lib/prisma";
import { unitScopeWhere } from "@/lib/staff-access";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const RANGE_OPTS: { range: DashboardRange; label: string }[] = [
  { range: "day", label: "Hoje" },
  { range: "7d", label: "7 dias" },
  { range: "month", label: "Mês" },
  { range: "3m", label: "3 meses" },
];

export default async function AdminRelatoriosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const access = await getStaffAccessOrNull();
  if (!access) return null;

  const sp = await searchParams;
  const chartRange = parseDashboardRange(
    typeof sp.chartRange === "string" ? sp.chartRange : undefined,
  );

  const [snapshot, units, staff] = await Promise.all([
    getAdminReportsSnapshot(access, chartRange, {}),
    prisma.barbershopUnit.findMany({
      where: { isActive: true, ...unitScopeWhere(access) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    access.role === "STAFF"
      ? Promise.resolve([])
      : prisma.staffMember.findMany({
          where: {
            organizationId: access.organizationId,
            role: { in: ["STAFF", "ADMIN", "OWNER"] },
          },
          select: { id: true, displayName: true, email: true },
          orderBy: [{ displayName: "asc" }, { email: "asc" }],
        }),
  ]);

  const staffOptions = staff.map((s) => ({
    id: s.id,
    label: s.displayName?.trim() || s.email,
  }));

  const cardClass =
    "rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-1";

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Análise"
            title="Relatórios"
            description={`Visão completa do salão · ${snapshot.periodLabel}`}
          />

          {access.permissions.viewRevenue &&
          (access.role === "OWNER" || access.role === "ADMIN") ? (
            <div className="mt-6">
              <AdminReportsPeriodAi chartRange={chartRange} />
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {RANGE_OPTS.map((o) => {
              const href =
                o.range === "month"
                  ? "/admin/relatorios"
                  : `/admin/relatorios?chartRange=${o.range}`;
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

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Reservas no período",
                value: String(snapshot.metrics.totalAppointments),
              },
              {
                label: "Taxa de conclusão",
                value: `${snapshot.completionRate}%`,
              },
              {
                label: "Taxa de cancelamento",
                value: `${snapshot.cancelRate}%`,
              },
              {
                label: "Clientes distintos",
                value: String(snapshot.metrics.distinctClients),
              },
              { label: "Ticket médio", value: money(snapshot.avgTicket) },
              {
                label: "Recebido",
                value: money(snapshot.metrics.receivedInPeriod),
                hide: !access.permissions.viewRevenue,
              },
              {
                label: "A receber",
                value: String(snapshot.metrics.pendingPaymentTotal),
              },
              {
                label: "Produtos (período)",
                value: money(snapshot.productRevenueInPeriod),
                hide: !access.permissions.viewRevenue,
              },
            ]
              .filter((c) => !("hide" in c && c.hide))
              .map((c) => (
                <div
                  key={c.label}
                  className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-4"
                >
                  <p className="text-xs font-medium text-[var(--bn-muted)]">
                    {c.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--bn-on)]">
                    {c.value}
                  </p>
                </div>
              ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className={cardClass}>
              <DashboardStatusPie
                data={snapshot.statusSlices}
                periodLabel={snapshot.periodLabel}
              />
            </div>
            <div className={cardClass}>
              <DashboardVolumeArea
                data={snapshot.series}
                title={snapshot.seriesTitle}
                subtitle={snapshot.periodLabel}
              />
            </div>
          </div>

          {access.permissions.viewRevenue ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className={cardClass}>
                <DashboardRevenueLine
                  data={snapshot.revenueSeries}
                  periodLabel={snapshot.periodLabel}
                />
              </div>
              <div className={cardClass}>
                <DashboardPaymentStack
                  data={snapshot.paymentStack}
                  periodLabel={snapshot.periodLabel}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className={cardClass}>
              <DashboardServicesBarChart
                data={snapshot.servicesInPeriod}
                periodLabel={snapshot.periodLabel}
              />
            </div>
            <div className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-5">
              <h2 className="font-display text-xl font-normal uppercase tracking-wide text-[var(--bn-primary)]">
                Origem de agendamentos
              </h2>
              {snapshot.bookingOrigins.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--bn-muted)]">Sem dados.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {snapshot.bookingOrigins.map((o) => (
                    <li
                      key={o.source || "none"}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-[var(--bn-on)]">{o.label}</span>
                      <span className="text-[var(--bn-muted)]">
                        {o.count} · {o.percent}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--bn-on)]">
                Equipe no período
              </h2>
              <ul className="mt-3 divide-y divide-[var(--bn-border)]">
                {snapshot.staffRanking.map((s) => (
                  <li
                    key={s.staffId ?? "none"}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="font-medium text-[var(--bn-on)]">
                      {s.label}
                    </span>
                    <span className="text-[var(--bn-muted)]">
                      {s.appointments} ag. · {s.completed} concl.
                      {access.permissions.viewRevenue
                        ? ` · ${money(s.received)}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {snapshot.club ? (
              <div className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-5">
                <h2 className="text-sm font-semibold text-[var(--bn-on)]">
                  Clube
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[var(--bn-muted)]">Ativos</p>
                    <p className="text-xl font-semibold">{snapshot.club.active}</p>
                  </div>
                  <div>
                    <p className="text-[var(--bn-muted)]">Em atraso</p>
                    <p className="text-xl font-semibold text-amber-300">
                      {snapshot.club.pastDue}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--bn-muted)]">Pausados</p>
                    <p className="text-xl font-semibold">{snapshot.club.paused}</p>
                  </div>
                  <div>
                    <p className="text-[var(--bn-muted)]">Cancelados</p>
                    <p className="text-xl font-semibold">
                      {snapshot.club.cancelled}
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/clube"
                  className="mt-4 inline-block text-xs font-medium text-[var(--bn-primary)] hover:underline"
                >
                  Abrir clube
                </Link>
              </div>
            ) : null}
          </div>

          <div className="mt-8">
            <AdminAppointmentFrequencyHeatmap
              units={units}
              staffOptions={staffOptions}
            />
          </div>

          <div className="mt-8">
            <DashboardSummaryTable rows={snapshot.summaryRows} />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}

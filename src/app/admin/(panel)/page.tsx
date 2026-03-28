import { format } from "date-fns";

import { AdminExportButton } from "@/components/admin-export-button";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminTable } from "@/components/admin-table";
import { AnimatedSection } from "@/components/animated-section";
import { DashboardPaymentStack } from "@/components/dashboard-payment-stack";
import { DashboardPeriodTabs } from "@/components/dashboard-period-tabs";
import { DashboardRevenueLine } from "@/components/dashboard-revenue-line";
import { DashboardServicesBarChart } from "@/components/dashboard-services-bar-chart";
import { DashboardStatusPie } from "@/components/dashboard-status-pie";
import { DashboardSummaryTable } from "@/components/dashboard-summary-table";
import { DashboardVolumeArea } from "@/components/dashboard-volume-area";
import { SectionTitle } from "@/components/section-title";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { cn } from "@/lib/utils";
import {
  getAdminAppointmentsPaginated,
  getAdminDashboardSnapshot,
} from "@/lib/admin-dashboard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ page?: string; chartRange?: string }>;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const access = await getStaffAccessOrNull();
  if (!access) {
    return null;
  }

  const { page: pageRaw, chartRange } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);

  const [snapshot, { rows, total, pageSize }, barberRows] = await Promise.all([
    getAdminDashboardSnapshot(access, chartRange),
    getAdminAppointmentsPaginated(access, page),
    access.role === "STAFF"
      ? Promise.resolve([] as const)
      : prisma.staffMember.findMany({
          where: { role: "STAFF" },
          select: { id: true, displayName: true, email: true, unitId: true },
          orderBy: [{ displayName: "asc" }, { email: "asc" }],
        }),
  ]);

  const {
    metrics,
    series,
    nextAppointment,
    statusSlices,
    servicesInPeriod,
    summaryRows,
    periodLabel,
    range,
    seriesTitle,
    revenueSeries,
    paymentStack,
  } = snapshot;
  const showUnitColumn = access.role !== "STAFF";
  const showBarberColumn = access.role !== "STAFF";
  const canAssignBarber = access.role === "OWNER" || access.role === "ADMIN";
  const canManagePayment = canAssignBarber;
  const showRevenue = access.permissions.viewRevenue;

  const barberOptions = barberRows.map((b) => ({
    id: b.id,
    label: b.displayName?.trim() || b.email,
    unitId: b.unitId,
  }));

  const overviewSubtitle =
    access.role === "STAFF"
      ? "Só vê agendamentos atribuídos a você. Peça ao administrador para associar reservas novas."
      : "Métricas e agendamentos do negócio. Atribua um profissional na lista quando a reserva ainda estiver sem barbeiro. Pagamentos: marque como pago após receber no balcão.";

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-8 md:pt-8">
        <AnimatedSection>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionTitle
              eyebrow="Painel administrativo"
              title="Visão da operação"
              subtitle={overviewSubtitle}
            />
            <AdminExportButton canExport={access.permissions.exportData} />
          </div>
        </AnimatedSection>
      </section>

      <section className="container-max pb-10">
        <AnimatedSection>
          <div
            className={cn(
              "grid gap-4 sm:grid-cols-2",
              showRevenue ? "xl:grid-cols-6" : "xl:grid-cols-4",
            )}
          >
            <div className="glass-card rounded-2xl p-5">
              <p className="text-sm text-zinc-400">Agendamentos hoje</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {metrics.totalToday}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <p className="text-sm text-zinc-400">Agendamentos na semana</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {metrics.totalWeek}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <p className="text-sm text-zinc-400">Clientes (cadastro telefone)</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {metrics.distinctClients}
              </p>
            </div>
            {showRevenue ? (
              <>
                <div className="glass-card rounded-2xl border border-amber-500/15 p-5">
                  <p className="text-sm text-zinc-400">Faturamento (mês, concluídos)</p>
                  <p className="mt-2 text-3xl font-semibold text-brand-300">
                    R$ {metrics.revenueMonth.toFixed(2)}
                  </p>
                </div>
                <div className="glass-card rounded-2xl border border-orange-500/20 p-5">
                  <p className="text-sm text-zinc-400">A receber (concluídos)</p>
                  <p className="mt-2 text-3xl font-semibold text-orange-300">
                    {metrics.pendingPaymentTotal}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Sem pagamento registado</p>
                </div>
                <div className="glass-card rounded-2xl p-5 sm:col-span-2 xl:col-span-1">
                  <p className="text-sm text-zinc-400">Recebido (período gráficos)</p>
                  <p className="mt-2 text-xl font-semibold text-emerald-300">
                    R$ {metrics.receivedInPeriod.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{periodLabel}</p>
                </div>
              </>
            ) : null}
            {!showRevenue ? (
              <div className="glass-card rounded-2xl p-5 sm:col-span-2 xl:col-span-1">
                <p className="text-sm text-zinc-400">Próximo horário</p>
                <p className="mt-2 text-lg font-semibold leading-snug text-brand-300">
                  {nextAppointment
                    ? `${nextAppointment.clientName} · ${format(
                        nextAppointment.startsAt,
                        "dd/MM HH:mm",
                      )}`
                    : "Sem agendamentos futuros"}
                </p>
              </div>
            ) : null}
          </div>
          {showRevenue ? (
            <div className="mt-4 glass-card rounded-2xl p-5">
              <p className="text-sm text-zinc-400">Próximo horário</p>
              <p className="mt-2 text-lg font-semibold leading-snug text-brand-300">
                {nextAppointment
                  ? `${nextAppointment.clientName} · ${format(
                      nextAppointment.startsAt,
                      "dd/MM HH:mm",
                    )}`
                  : "Sem agendamentos futuros"}
              </p>
            </div>
          ) : null}
        </AnimatedSection>
      </section>

      <section className="container-max pb-6">
        <AnimatedSection delay={0.04}>
          <DashboardPeriodTabs current={range} page={page} />
        </AnimatedSection>
      </section>

      <section className="container-max pb-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <AnimatedSection delay={0.06}>
            <DashboardStatusPie data={statusSlices} periodLabel={periodLabel} />
          </AnimatedSection>
          <AnimatedSection delay={0.08}>
            <DashboardVolumeArea
              data={series}
              title="Volume no tempo"
              subtitle={seriesTitle}
            />
          </AnimatedSection>
        </div>
      </section>

      {showRevenue ? (
        <section className="container-max pb-10">
          <div className="grid gap-6 lg:grid-cols-2">
            <AnimatedSection delay={0.09}>
              <DashboardRevenueLine data={revenueSeries} periodLabel={periodLabel} />
            </AnimatedSection>
            <AnimatedSection delay={0.095}>
              <DashboardPaymentStack data={paymentStack} periodLabel={periodLabel} />
            </AnimatedSection>
          </div>
        </section>
      ) : null}

      <section className="container-max pb-10">
        <AnimatedSection delay={0.1}>
          <DashboardServicesBarChart
            data={servicesInPeriod}
            periodLabel={periodLabel}
          />
        </AnimatedSection>
      </section>

      <section className="container-max pb-10">
        <AnimatedSection delay={0.12}>
          <DashboardSummaryTable rows={summaryRows} />
        </AnimatedSection>
      </section>

      <section className="container-max pb-16">
        <AnimatedSection delay={0.15}>
          <AdminTable
            appointments={rows}
            showUnitColumn={showUnitColumn}
            showBarberColumn={showBarberColumn}
            barbers={barberOptions}
            canAssignBarber={canAssignBarber}
            canManagePayment={canManagePayment}
            title="Lista de agendamentos"
            subtitle={`${total} registo(s) no total · página ${page}`}
            footer={
              <AdminPagination
                page={page}
                pageSize={pageSize}
                total={total}
                chartRange={range}
              />
            }
          />
        </AnimatedSection>
      </section>
    </main>
  );
}

import { format } from "date-fns";

import { AdminExportButton } from "@/components/admin-export-button";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminTable } from "@/components/admin-table";
import { AnimatedSection } from "@/components/animated-section";
import { DashboardChart } from "@/components/dashboard-chart";
import { Navbar } from "@/components/navbar";
import { SectionTitle } from "@/components/section-title";
import { SiteFooter } from "@/components/site-footer";
import {
  getAdminAppointmentsPaginated,
  getAdminDashboardSnapshot,
} from "@/lib/admin-dashboard";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ page?: string }>;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);

  const [snapshot, { rows, total, pageSize }] = await Promise.all([
    getAdminDashboardSnapshot(),
    getAdminAppointmentsPaginated(page),
  ]);

  const { metrics, series, nextAppointment } = snapshot;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="container-max pt-12 pb-8 md:pt-16">
          <AnimatedSection>
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <SectionTitle
                eyebrow="Painel Administrativo"
                title="Visão gerencial da barbearia"
                subtitle="Acompanhe horários, métricas de agendamentos e exporte tudo para Excel com um clique."
              />
              <AdminExportButton />
            </div>
          </AnimatedSection>
        </section>

        <section className="container-max pb-10">
          <AnimatedSection>
            <div className="grid gap-4 md:grid-cols-3">
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
                <p className="text-sm text-zinc-400">Próximo horário</p>
                <p className="mt-2 text-xl font-semibold text-brand-300">
                  {nextAppointment
                    ? `${nextAppointment.clientName} · ${format(
                        nextAppointment.startsAt,
                        "dd/MM HH:mm",
                      )}`
                    : "Sem agendamentos futuros"}
                </p>
              </div>
            </div>
          </AnimatedSection>
        </section>

        <section className="container-max pb-10">
          <AnimatedSection delay={0.1}>
            <DashboardChart data={series} />
          </AnimatedSection>
        </section>

        <section className="container-max pb-16">
          <AnimatedSection delay={0.15}>
            <AdminTable
              appointments={rows}
              footer={
                <AdminPagination page={page} pageSize={pageSize} total={total} />
              }
            />
          </AnimatedSection>
        </section>
      </main>
      <SiteFooter showPitch={false} />
    </>
  );
}

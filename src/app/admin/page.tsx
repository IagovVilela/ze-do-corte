import { format, isThisWeek, isToday } from "date-fns";

import { AdminTable } from "@/components/admin-table";
import { AnimatedSection } from "@/components/animated-section";
import { DashboardChart } from "@/components/dashboard-chart";
import { Navbar } from "@/components/navbar";
import { SectionTitle } from "@/components/section-title";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const appointments = await prisma.appointment.findMany({
    include: {
      service: true,
    },
    orderBy: {
      startsAt: "desc",
    },
    take: 30,
  });

  const rows = appointments.map((item) => ({
    id: item.id,
    clientName: item.clientName,
    clientPhone: item.clientPhone,
    clientEmail: item.clientEmail,
    serviceName: item.service.name,
    startsAt: item.startsAt.toISOString(),
    status: item.status,
  }));

  const nextAppointment = appointments
    .filter((item) => item.startsAt > new Date())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

  const totalToday = rows.filter((item) => isToday(new Date(item.startsAt))).length;
  const totalWeek = rows.filter((item) =>
    isThisWeek(new Date(item.startsAt), { weekStartsOn: 1 }),
  ).length;
  const chartMap = new Map<string, number>();
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const current = new Date(now);
    current.setDate(now.getDate() - i);
    const key = format(current, "yyyy-MM-dd");
    chartMap.set(key, 0);
  }
  rows.forEach((item) => {
    const key = format(new Date(item.startsAt), "yyyy-MM-dd");
    if (chartMap.has(key)) {
      chartMap.set(key, (chartMap.get(key) ?? 0) + 1);
    }
  });
  const chartData = Array.from(chartMap.entries()).map(([date, count]) => ({
    date,
    dateLabel: format(new Date(`${date}T00:00:00`), "dd/MM"),
    count,
  }));

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="container-max pt-12 pb-8 md:pt-16">
          <AnimatedSection>
            <SectionTitle
              eyebrow="Painel Administrativo"
              title="Visão gerencial da barbearia"
              subtitle="Acompanhe horários, métricas de agendamentos e exporte tudo para Excel com um clique."
            />
          </AnimatedSection>
        </section>

        <section className="container-max pb-10">
          <AnimatedSection>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="glass-card rounded-2xl p-5">
                <p className="text-sm text-zinc-400">Agendamentos hoje</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {totalToday}
                </p>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <p className="text-sm text-zinc-400">Agendamentos na semana</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {totalWeek}
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
            <DashboardChart data={chartData} />
          </AnimatedSection>
        </section>

        <section className="container-max pb-16">
          <AnimatedSection delay={0.15}>
            <AdminTable appointments={rows} />
          </AnimatedSection>
        </section>
      </main>
      <SiteFooter showPitch={false} />
    </>
  );
}

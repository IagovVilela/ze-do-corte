import { redirect } from "next/navigation";

import { AdminAppointmentFrequencyHeatmap } from "@/components/admin-appointment-frequency-heatmap";
import { AdminAppointmentsCalendar } from "@/components/admin-appointments-calendar";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AnimatedSection } from "@/components/animated-section";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { BARBER_TIMEZONE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { unitScopeWhere } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

export default async function AdminAgendamentosPage() {
  const access = await getStaffAccessOrNull();
  if (!access) {
    redirect("/admin/login");
  }

  const productsPromise = (async () => {
    try {
      return await prisma.product.findMany({
        where: {
          organizationId: access.organizationId,
          isActive: true,
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, price: true, stockQty: true },
      });
    } catch (err) {
      // Não use console.error(err): o Next trata Error no console como overlay.
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[admin/agendamentos] produtos indisponíveis (${msg.split("\n")[0] ?? "erro"}). Continuando sem catálogo.`,
      );
      return [] as {
        id: string;
        name: string;
        price: unknown;
        stockQty: number | null;
      }[];
    }
  })();

  const [org, units, staff, services, products] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: access.organizationId },
      select: { timezone: true },
    }),
    prisma.barbershopUnit.findMany({
      where: { isActive: true, ...unitScopeWhere(access) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    access.role === "STAFF"
      ? Promise.resolve([])
      : prisma.staffMember.findMany({
          where: {
            organizationId: access.organizationId,
            role: { in: ["STAFF", "ADMIN", "OWNER"] },
          },
          orderBy: [{ displayName: "asc" }, { email: "asc" }],
          select: { id: true, displayName: true, email: true },
        }),
    prisma.service.findMany({
      where: {
        isActive: true,
        unit: { organizationId: access.organizationId },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true },
    }),
    productsPromise,
  ]);

  const timezone = org?.timezone?.trim() || BARBER_TIMEZONE;
  const staffOptions = staff.map((s) => ({
    id: s.id,
    label: s.displayName?.trim() || s.email,
  }));
  const canManageStatus =
    access.role === "OWNER" || access.role === "ADMIN";

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Operação"
            title="Agendamentos"
            description="Frequência de cortes, grade por período e comanda ao clicar no horário."
          />
          <div className="mt-8 space-y-8">
            <AdminAppointmentFrequencyHeatmap
              units={units}
              staffOptions={staffOptions}
            />
            <AdminAppointmentsCalendar
              timezone={timezone}
              canManageStatus={canManageStatus}
              units={units}
              staffOptions={staffOptions}
              catalogServices={services.map((s) => ({
                id: s.id,
                name: s.name,
                price: Number(s.price),
              }))}
              catalogProducts={products.map((p) => ({
                id: p.id,
                name: p.name,
                price: Number(p.price),
                stockQty: p.stockQty,
              }))}
            />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}

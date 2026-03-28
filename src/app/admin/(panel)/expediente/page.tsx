import { redirect } from "next/navigation";

import { AdminWorkScheduleForm } from "@/components/admin-work-schedule-form";
import { AnimatedSection } from "@/components/animated-section";
import { SectionTitle } from "@/components/section-title";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  defaultWorkWeekFromShop,
  parseWorkWeekFromDb,
} from "@/lib/work-week";

export const dynamic = "force-dynamic";

export default async function AdminExpedientePage() {
  const access = await getStaffAccessOrNull();
  if (!access) {
    redirect("/admin/login");
  }
  if (access.role !== "STAFF") {
    redirect("/admin");
  }

  const member = await prisma.staffMember.findUnique({
    where: { id: access.userId },
    select: { workWeekJson: true },
  });

  const defaults = defaultWorkWeekFromShop();
  const custom = parseWorkWeekFromDb(member?.workWeekJson ?? null);
  const usesCustom = custom !== null;
  const initialWeek = custom ?? defaults;

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <SectionTitle
            eyebrow="Agenda"
            title="Meu expediente"
            subtitle="Defina em que dias e horários você aceita agendamentos com o seu nome. Respeita sempre os limites da barbearia."
          />
          <div className="mt-8">
            <AdminWorkScheduleForm
              initialWeek={initialWeek}
              usesCustomInitial={usesCustom}
            />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}

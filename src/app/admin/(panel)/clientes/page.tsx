import { AdminCrmPanel } from "@/components/admin-crm-panel";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AnimatedSection } from "@/components/animated-section";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { getAdminCrmSnapshot } from "@/lib/admin-crm";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const access = await getStaffAccessOrNull();
  if (!access) return null;

  const sp = await searchParams;
  const riskRaw = typeof sp.risk === "string" ? sp.risk : "all";
  const riskFilter =
    riskRaw === "at_risk" ||
    riskRaw === "lost" ||
    riskRaw === "actionable"
      ? riskRaw
      : "all";

  const initial = await getAdminCrmSnapshot(access, {
    riskFilter,
    sort: riskFilter !== "all" ? "risk" : "lastVisit",
  });

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Operação"
            title="Clientes"
            description="CRM do salão — quem já agendou ou está no clube, com visitas, risco de churn e WhatsApp."
          />
          <AdminCrmPanel initial={initial} />
        </AnimatedSection>
      </section>
    </main>
  );
}

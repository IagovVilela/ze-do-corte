import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminReviewsPanel } from "@/components/admin-reviews-panel";
import { AnimatedSection } from "@/components/animated-section";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { getAdminReviewsSnapshot } from "@/lib/admin-reviews";

export const dynamic = "force-dynamic";

export default async function AdminAvaliacoesPage() {
  const access = await getStaffAccessOrNull();
  if (!access) return null;

  const initial = await getAdminReviewsSnapshot(access.organizationId);

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Visão geral"
            title="Avaliações"
            description="Feedback dos clientes após o atendimento — enviado pelo link da reserva."
          />
          <AdminReviewsPanel initial={initial} />
        </AnimatedSection>
      </section>
    </main>
  );
}

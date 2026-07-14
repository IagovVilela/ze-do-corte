import { redirect } from "next/navigation";

import { SectionTitle } from "@/components/section-title";
import { WhatsAppAdminPanel } from "@/components/whatsapp-admin-panel";
import { getStaffAccessOrNull } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppPage() {
  const access = await getStaffAccessOrNull();
  if (!access) return null;
  if (!access.permissions.manageBranding) {
    redirect("/admin");
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Integrações"
        title="WhatsApp"
        description="Conecte o número Business (Meta Cloud API) para o bot agendar, remarcar e cancelar, e para enviar confirmações e lembretes."
      />
      <WhatsAppAdminPanel />
    </div>
  );
}

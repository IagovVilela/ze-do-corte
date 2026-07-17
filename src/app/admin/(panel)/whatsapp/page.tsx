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
    <div className="space-y-8 py-6">
      <SectionTitle
        eyebrow="Atendimento"
        title="WhatsApp"
        description="Cadastre o número da barbearia para o site. Se quiser, depois ligue o assistente que agenda sozinho."
      />
      <WhatsAppAdminPanel />
    </div>
  );
}

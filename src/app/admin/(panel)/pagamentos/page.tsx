import { redirect } from "next/navigation";

import { PaymentsAdminPanel } from "@/components/payments-admin-panel";
import { SectionTitle } from "@/components/section-title";
import { getStaffAccessOrNull } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPagamentosPage() {
  const access = await getStaffAccessOrNull();
  if (!access) return null;
  if (access.role !== "OWNER" && !access.permissions.manageSettings) {
    redirect("/admin");
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Integrações"
        title="Pagamentos"
        description="Conecte a conta Asaas da barbearia para receber PIX de agendamentos e assinaturas do clube — o valor cai direto na sua conta."
      />
      <PaymentsAdminPanel />
    </div>
  );
}

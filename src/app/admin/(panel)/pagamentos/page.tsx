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
    <div className="space-y-8 py-6">
      <SectionTitle
        eyebrow="Receber clientes"
        title="Pagamentos"
        description="Ligue o PIX automático do site e do clube. O dinheiro entra na sua conta Asaas e de lá você transfere para o seu banco."
      />
      <PaymentsAdminPanel />
    </div>
  );
}

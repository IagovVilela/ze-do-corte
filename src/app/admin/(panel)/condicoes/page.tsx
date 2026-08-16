import { AdminPageHeader } from "@/components/admin-page-header";
import { PlatformInformativosList } from "@/components/platform-informativos-list";
import { getStaffAccessOrNull } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminCondicoesPage() {
  const access = await getStaffAccessOrNull();
  if (!access) return null;

  return (
    <div className="space-y-8 py-6">
      <AdminPageHeader
        eyebrow="Conta"
        title="Condições e informativos"
        description="Termos, privacidade e PDFs para você ter ciência de como funcionam pagamentos, WhatsApp e o plano Barbernegon."
      />
      <PlatformInformativosList tone="admin" />
    </div>
  );
}

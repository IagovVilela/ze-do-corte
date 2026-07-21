import { AdminPageHeader } from "@/components/admin-page-header";
import { SupportAdminPanel } from "@/components/support-admin-panel";
import { getStaffAccessOrNull } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminSuportePage() {
  const access = await getStaffAccessOrNull();
  if (!access) return null;

  return (
    <div className="space-y-8 py-6">
      <AdminPageHeader
        eyebrow="Conta"
        title="Suporte"
        description="Central de ajuda, seus chamados e contato com a Barbernegon."
      />
      <SupportAdminPanel />
    </div>
  );
}

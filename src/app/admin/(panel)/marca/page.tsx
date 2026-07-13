import { SectionTitle } from "@/components/section-title";
import { BrandEditorForm } from "@/components/brand-editor-form";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminMarcaPage() {
  const access = await getStaffAccessOrNull();
  if (!access) return null;
  if (!access.permissions.manageBranding) {
    redirect("/admin");
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Marca"
        title="Identidade do seu site"
        description="Logo, cores, slogans e contatos — o que o cliente vê em /sua-barbearia."
      />
      <BrandEditorForm />
    </div>
  );
}

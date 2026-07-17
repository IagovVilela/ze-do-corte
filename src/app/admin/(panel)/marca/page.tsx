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
    <div className="space-y-8 py-6">
      <SectionTitle
        eyebrow="Marca"
        title="Identidade"
        description="Nome, slug, logo, cores e redes. O layout visual da página pública se monta no canvas em Site."
      />
      <BrandEditorForm />
    </div>
  );
}

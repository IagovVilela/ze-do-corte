import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminProductsManager } from "@/components/admin-products-manager";
import { AnimatedSection } from "@/components/animated-section";
import { getStaffAccessOrNull } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminProdutosPage() {
  const access = await getStaffAccessOrNull();
  if (!access) redirect("/admin/login");
  if (access.role !== "OWNER" && access.role !== "ADMIN") {
    redirect("/admin");
  }

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Operação"
            title="Produtos"
            description="Catálogo para venda na comanda do atendimento (balcão)."
          />
          <div className="mt-8">
            <AdminProductsManager />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}

import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminProductSalePanel } from "@/components/admin-product-sale-panel";
import { AdminProductsManager } from "@/components/admin-products-manager";
import { AnimatedSection } from "@/components/animated-section";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProdutosPage() {
  const access = await getStaffAccessOrNull();
  if (!access) redirect("/admin/login");

  const canManageCatalog =
    access.role === "OWNER" ||
    access.role === "ADMIN" ||
    access.permissions.manageServices;

  const products = await prisma.product.findMany({
    where: { organizationId: access.organizationId, isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      price: true,
      isActive: true,
      stockQty: true,
    },
  });

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Operação"
            title="Produtos"
            description={
              canManageCatalog
                ? "Venda avulsa no balcão, catálogo/estoque e loja online (/{seu-slug}/loja)."
                : "Venda avulsa no balcão com baixa de estoque. Catálogo é gerido pelo dono/admin."
            }
          />
          <div className="mt-8 space-y-10">
            <AdminProductSalePanel
              products={products.map((p) => ({
                id: p.id,
                name: p.name,
                price: Number(p.price),
                isActive: p.isActive,
                stockQty: p.stockQty,
              }))}
            />
            {canManageCatalog ? (
              <div>
                <h2 className="mb-3 text-sm font-semibold text-[var(--bn-on)]">
                  Catálogo e estoque
                </h2>
                <AdminProductsManager />
              </div>
            ) : null}
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}

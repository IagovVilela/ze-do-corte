import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Navbar } from "@/components/navbar";
import { PublicProductStore } from "@/components/public-product-store";
import { SiteFooter } from "@/components/site-footer";
import { getOrgAsaasApiKey } from "@/lib/asaas-org";
import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";
import { orgDisplaySlogan } from "@/lib/org-branding";
import { listPublicCatalogProducts } from "@/lib/product-sales";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return { title: "Loja" };
  return {
    title: `Loja · ${org.name}`,
    description: `Compre produtos de ${org.name} com PIX.`,
  };
}

export default async function TenantStorePage({ params }: Props) {
  const { slug } = await params;
  if (isReservedSlug(slug)) notFound();
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();

  const [products, apiKey] = await Promise.all([
    listPublicCatalogProducts(org.id),
    getOrgAsaasApiKey(org.id),
  ]);

  const slogans = orgDisplaySlogan(org);
  const homeHref = `/${org.slug}`;
  const bookHref = `/${org.slug}/agendar`;
  const shopHref = `/${org.slug}/loja`;

  return (
    <>
      <Navbar
        brandName={org.name}
        logoUrl={org.logoUrl}
        homeHref={homeHref}
        bookHref={bookHref}
        shopHref={shopHref}
        phoneLabel={org.phoneLabel}
        whatsappHref={org.whatsappHref}
        instagramHref={org.instagramHref}
      />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-24 sm:pt-28">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
          Loja
        </p>
        <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">
          Produtos de {org.name}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-zinc-400">
          {slogans.primary} Escolha o que quiser e pague com PIX — ou peça no
          balcão que o barbeiro dá baixa no estoque.
        </p>
        <div className="mt-8">
          <PublicProductStore
            slug={org.slug}
            orgName={org.name}
            products={products}
            pixAvailable={Boolean(apiKey)}
          />
        </div>
      </main>
      <SiteFooter showPitch={false} brandName={org.name} />
    </>
  );
}

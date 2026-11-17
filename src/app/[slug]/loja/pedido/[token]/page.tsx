import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Navbar } from "@/components/navbar";
import { PublicProductOrderStatus } from "@/components/public-product-order-status";
import { SiteFooter } from "@/components/site-footer";
import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  return { title: org ? `Pedido · ${org.name}` : "Pedido" };
}

export default async function TenantStoreOrderPage({ params }: Props) {
  const { slug, token } = await params;
  if (isReservedSlug(slug)) notFound();
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();

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
      <main className="mx-auto max-w-lg px-4 pb-16 pt-24 sm:pt-28">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
          Pedido
        </p>
        <h1 className="mt-2 font-display text-3xl text-white">Status do PIX</h1>
        <p className="mt-2 text-sm text-zinc-400">
          <Link href={shopHref} className="text-brand-200 underline">
            Voltar à loja
          </Link>
        </p>
        <div className="mt-8">
          <PublicProductOrderStatus slug={org.slug} token={token} />
        </div>
      </main>
      <SiteFooter showPitch={false} brandName={org.name} />
    </>
  );
}

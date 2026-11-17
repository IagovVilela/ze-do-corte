import { NextResponse } from "next/server";

import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";
import { listPublicCatalogProducts } from "@/lib/product-sales";
import { getOrgAsaasApiKey } from "@/lib/asaas-org";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  if (isReservedSlug(slug)) {
    return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  }
  const org = await getOrganizationBySlug(slug);
  if (!org) {
    return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  }

  const [products, apiKey] = await Promise.all([
    listPublicCatalogProducts(org.id),
    getOrgAsaasApiKey(org.id),
  ]);

  return NextResponse.json({
    organization: { id: org.id, name: org.name, slug: org.slug },
    pixAvailable: Boolean(apiKey),
    products,
  });
}

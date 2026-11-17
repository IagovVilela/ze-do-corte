import { NextResponse } from "next/server";

import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";
import { getProductSaleByManageToken } from "@/lib/product-sales";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string; token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug, token } = await context.params;
  if (isReservedSlug(slug)) {
    return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  }
  const org = await getOrganizationBySlug(slug);
  if (!org) {
    return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  }

  const sale = await getProductSaleByManageToken(org.id, token);
  if (!sale) {
    return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    organization: { name: org.name, slug: org.slug },
    sale: {
      id: sale.id,
      paymentStatus: sale.paymentStatus,
      paidAt: sale.paidAt,
      amountTotal: sale.amountTotal,
      paymentMethod: sale.paymentMethod,
      clientName: sale.clientName,
      items: sale.items,
      createdAt: sale.createdAt,
    },
  });
}

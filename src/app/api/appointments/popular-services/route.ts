import { NextResponse } from "next/server";

import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";
import { getPopularServiceIds } from "@/lib/popular-services";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/appointments/popular-services?organizationSlug=&unitId=
 * Ranking público dos serviços mais pedidos (sem auth).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get("organizationSlug") ?? "").trim();
  const unitId = (url.searchParams.get("unitId") ?? "").trim() || null;

  if (!slug || isReservedSlug(slug)) {
    return NextResponse.json({ message: "Barbearia inválida." }, { status: 400 });
  }

  const org = await getOrganizationBySlug(slug);
  if (!org) {
    return NextResponse.json({ message: "Barbearia não encontrada." }, { status: 404 });
  }

  if (unitId) {
    const unit = await prisma.barbershopUnit.findFirst({
      where: { id: unitId, organizationId: org.id, isActive: true },
      select: { id: true },
    });
    if (!unit) {
      return NextResponse.json({ message: "Unidade inválida." }, { status: 400 });
    }
  }

  const serviceIds = await getPopularServiceIds({
    organizationId: org.id,
    unitId,
    limit: 5,
  });

  return NextResponse.json({ serviceIds });
}

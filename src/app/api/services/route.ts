import { NextResponse } from "next/server";

import { getServicesForBooking } from "@/lib/data";
import { getOrganizationBySlug } from "@/lib/organization";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationSlug = searchParams.get("organizationSlug");
    if (!organizationSlug?.trim()) {
      return NextResponse.json(
        { message: "organizationSlug é obrigatório." },
        { status: 400 },
      );
    }

    const org = await getOrganizationBySlug(organizationSlug);
    if (!org) {
      return NextResponse.json(
        { message: "Barbearia não encontrada." },
        { status: 404 },
      );
    }

    const services = await getServicesForBooking(org.id);
    return NextResponse.json({ services });
  } catch (error) {
    console.error("Erro ao buscar serviços:", error);
    return NextResponse.json(
      { message: "Erro interno ao buscar serviços." },
      { status: 500 },
    );
  }
}

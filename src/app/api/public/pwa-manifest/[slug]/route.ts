import { NextResponse } from "next/server";

import { buildPwaManifest } from "@/lib/pwa-manifest";
import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";
import { orgDisplaySlogan } from "@/lib/org-branding";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/**
 * Web App Manifest por tenant (`/{slug}`) ou painel (`admin`).
 * Usado para “Instalar app” no site, agendar e painel.
 */
export async function GET(_request: Request, { params }: Params) {
  const { slug: raw } = await params;
  const slug = raw.trim().toLowerCase();

  if (slug === "admin") {
    const body = buildPwaManifest({
      name: "Barbernegon Painel",
      shortName: "Painel",
      description: "Painel da barbearia — agenda, clientes e operação.",
      startUrl: "/admin",
      scope: "/admin",
      themeColor: "#0f1419",
      iconUrl: "/images/barbernegon-logo.png",
      shortcuts: [
        {
          name: "Agenda",
          short_name: "Agenda",
          url: "/admin",
        },
        {
          name: "Meu perfil",
          short_name: "Perfil",
          url: "/admin/perfil",
        },
      ],
    });
    return NextResponse.json(body, {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  if (!slug || isReservedSlug(slug)) {
    return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  }

  const org = await getOrganizationBySlug(slug);
  if (!org) {
    return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  }

  const slogans = orgDisplaySlogan(org);
  const scope = `/${org.slug}`;
  const body = buildPwaManifest({
    name: org.name,
    shortName: org.name,
    description: `${slogans.primary}. Agende pelo app da ${org.name}.`,
    startUrl: scope,
    scope,
    themeColor: org.primaryColor,
    iconUrl: org.logoUrl,
    shortcuts: [
      {
        name: "Agendar horário",
        short_name: "Agendar",
        description: "Escolha serviço e horário",
        url: `${scope}/agendar`,
      },
    ],
  });

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

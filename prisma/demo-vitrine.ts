/**
 * Branding da org demonstrativa (slug ze-do-corte → nome Barbergon + template vitrine).
 * Usado pelo seed e pelo script one-shot de produção.
 */
import type { Prisma } from "@prisma/client";

import { buildCanvasPageTemplate } from "../src/lib/canvas-page-templates";

export const DEMO_ORG_SLUG = "ze-do-corte";
export const DEMO_ORG_ID = "org_ze_do_corte_default";
export const DEMO_SHOP_NAME = "Barbergon";

export const DEMO_ORG_BRANDING = {
  name: DEMO_SHOP_NAME,
  slogan: "A cara do seu salão. Agenda no celular.",
  sloganSecondary:
    "Demonstração do editor visual Barbernegon — foto, tipografia e layout livres.",
  primaryColor: "#3b82f6",
  logoUrl: "/images/barbernegon-logo.png",
  heroMediaUrl: "/images/landing/hero-barbershop.png",
  aboutText:
    "Barbearia demonstrativa da plataforma Barbernegon. Abra /admin/site, mude fotos e textos — o mesmo canvas que seus clientes usam.",
} as const;

export function demoSiteJson(): Prisma.InputJsonValue {
  return buildCanvasPageTemplate(
    "vitrine",
    DEMO_SHOP_NAME,
  ) as unknown as Prisma.InputJsonValue;
}

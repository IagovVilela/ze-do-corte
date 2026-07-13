import "server-only";

import type { CSSProperties } from "react";

import type { OrganizationPublic } from "@/lib/organization";

export function organizationBrandStyle(
  org: Pick<OrganizationPublic, "primaryColor">,
): CSSProperties {
  const color = org.primaryColor?.trim() || "#f59e0b";
  return {
    ["--brand" as string]: color,
    ["--color-brand-500" as string]: color,
  } as CSSProperties;
}

export function orgDisplaySlogan(
  org: Pick<OrganizationPublic, "slogan" | "sloganSecondary" | "name">,
): { primary: string; secondary: string } {
  return {
    primary: org.slogan?.trim() || org.name,
    secondary:
      org.sloganSecondary?.trim() ||
      "Agende online com a cara da sua barbearia.",
  };
}

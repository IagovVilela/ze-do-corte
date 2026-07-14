import "server-only";

import type { CSSProperties } from "react";

import { canvasThemeStyle } from "@/lib/canvas-theme-style";
import type { OrganizationPublic } from "@/lib/organization";
import {
  parseSiteCanvasConfig,
  type CanvasTheme,
  type SiteCanvasConfig,
} from "@/lib/site-canvas";

export function resolveSiteCanvas(
  org: Pick<OrganizationPublic, "name" | "siteJson" | "primaryColor">,
): SiteCanvasConfig {
  const config = parseSiteCanvasConfig(org.siteJson, org.name);
  const primary = org.primaryColor?.trim();
  if (primary && !config.theme?.primary) {
    return {
      ...config,
      theme: { ...config.theme, primary } satisfies CanvasTheme,
    };
  }
  return config;
}

export function organizationBrandStyle(
  org: Pick<OrganizationPublic, "primaryColor" | "name" | "siteJson">,
): CSSProperties {
  const site = resolveSiteCanvas(org);
  return canvasThemeStyle(site.theme, org.primaryColor);
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

/** @deprecated Prefer resolveSiteCanvas — mantido para compat interna. */
export function resolveSiteConfig(
  org: Pick<OrganizationPublic, "name" | "siteJson" | "primaryColor">,
) {
  return resolveSiteCanvas(org);
}

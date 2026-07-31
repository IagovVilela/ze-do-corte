import type { MetadataRoute } from "next";

const FALLBACK_ICON = "/images/barbernegon-logo.png";

export type PwaManifestInput = {
  name: string;
  shortName?: string;
  description: string;
  startUrl: string;
  scope: string;
  themeColor?: string | null;
  backgroundColor?: string;
  iconUrl?: string | null;
  shortcuts?: MetadataRoute.Manifest["shortcuts"];
};

function iconEntries(iconUrl: string | null | undefined): MetadataRoute.Manifest["icons"] {
  const primary = iconUrl?.trim() || FALLBACK_ICON;
  const icons: NonNullable<MetadataRoute.Manifest["icons"]> = [
    { src: primary, sizes: "192x192", type: "image/png", purpose: "any" },
    { src: primary, sizes: "512x512", type: "image/png", purpose: "any" },
    { src: primary, sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];
  if (primary !== FALLBACK_ICON) {
    icons.push(
      { src: FALLBACK_ICON, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: FALLBACK_ICON, sizes: "512x512", type: "image/png", purpose: "any" },
    );
  }
  return icons;
}

/** Monta o web app manifest (tenant ou painel). */
export function buildPwaManifest(input: PwaManifestInput): MetadataRoute.Manifest {
  const short =
    input.shortName?.trim() ||
    (input.name.length > 12 ? `${input.name.slice(0, 11)}…` : input.name);

  return {
    id: input.scope,
    name: input.name,
    short_name: short,
    description: input.description,
    start_url: input.startUrl,
    scope: input.scope,
    display: "standalone",
    orientation: "portrait-primary",
    lang: "pt-BR",
    dir: "ltr",
    background_color: input.backgroundColor ?? "#0a0a0a",
    theme_color: input.themeColor?.trim() || "#c9a227",
    icons: iconEntries(input.iconUrl),
    shortcuts: input.shortcuts,
  };
}

export function tenantPwaManifestPath(slug: string): string {
  return `/api/public/pwa-manifest/${encodeURIComponent(slug)}`;
}

export const ADMIN_PWA_MANIFEST_PATH = "/api/public/pwa-manifest/admin";

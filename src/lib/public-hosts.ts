/**
 * Domínios públicos: landing B2B (marketing) vs marketplace (consumidor).
 * Seguro para Edge (proxy), Server e Client Components.
 */

export type PublicSurface = "marketing" | "marketplace" | "shared";

/** Prefixos só no host de marketing — no marketplace redirecionam. */
export const MARKETING_ONLY_PATH_PREFIXES = [
  "/cadastro",
  "/planos",
  "/admin",
  "/plataforma",
  "/api/admin",
  "/api/plataforma",
  "/api/auth",
] as const;

export function normalizeConfiguredHost(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

/** Host do request (header Host), minúsculo, sem espaços. */
export function normalizeRequestHost(hostHeader: string | null): string | null {
  if (!hostHeader?.trim()) return null;
  return hostHeader.split(",")[0]?.trim().toLowerCase() ?? null;
}

function stripWww(host: string): string {
  return host.replace(/^www\./, "");
}

export function hostsMatch(a: string, b: string): boolean {
  return stripWww(a) === stripWww(b);
}

export function getMarketingHost(): string | null {
  return normalizeConfiguredHost(process.env.NEXT_PUBLIC_MARKETING_HOST);
}

export function getMarketplaceHost(): string | null {
  return normalizeConfiguredHost(process.env.NEXT_PUBLIC_MARKETPLACE_HOST);
}

/** Split ativo só com dois hosts distintos configurados. */
export function hostsSplitConfigured(): boolean {
  const marketing = getMarketingHost();
  const marketplace = getMarketplaceHost();
  return Boolean(
    marketing && marketplace && !hostsMatch(marketing, marketplace),
  );
}

export function resolvePublicSurface(
  requestHost: string | null,
): PublicSurface {
  if (!hostsSplitConfigured()) return "shared";
  const host = normalizeRequestHost(requestHost);
  if (!host) return "shared";

  const marketing = getMarketingHost()!;
  const marketplace = getMarketplaceHost()!;
  if (hostsMatch(host, marketplace)) return "marketplace";
  if (hostsMatch(host, marketing)) return "marketing";
  return "shared";
}

export function absoluteUrlOnHost(
  host: string,
  pathAndSearch: string,
): string {
  const path = pathAndSearch.startsWith("/")
    ? pathAndSearch
    : `/${pathAndSearch}`;
  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".local");
  const protocol = isLocal ? "http" : "https";
  return `${protocol}://${host}${path}`;
}

/**
 * URL para uma superfície. Sem split configurado, devolve path relativo.
 */
export function publicSurfaceUrl(
  surface: "marketing" | "marketplace",
  path: string,
): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!hostsSplitConfigured()) return normalized;
  const host =
    surface === "marketing" ? getMarketingHost()! : getMarketplaceHost()!;
  return absoluteUrlOnHost(host, normalized);
}

/** Home do marketplace: `/` no host consumer; `/explorar` quando compartilhado. */
export function marketplaceHomePath(): string {
  return hostsSplitConfigured() ? "/" : "/explorar";
}

export function isMarketingOnlyPath(pathname: string): boolean {
  return MARKETING_ONLY_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isMarketplaceExplorePath(pathname: string): boolean {
  return pathname === "/explorar" || pathname.startsWith("/explorar/");
}

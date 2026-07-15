/** Tipos e UI do marketplace — seguro para Client Components (sem Prisma). */

export type MarketplaceServiceCategory =
  | "CORTE"
  | "BARBA"
  | "COMBO"
  | "TRATAMENTO"
  | "OUTRO";

export type MarketplaceShopService = {
  id: string;
  name: string;
  category: MarketplaceServiceCategory;
  price: number;
};

export type MarketplaceShop = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  heroMediaUrl: string | null;
  primaryColor: string | null;
  slogan: string | null;
  city: string | null;
  addressLine: string | null;
  unitName: string | null;
  services: MarketplaceShopService[];
  ratingAvg: number | null;
  ratingCount: number;
};

export type MarketplaceSearchInput = {
  q?: string;
  city?: string;
  category?: string;
  limit?: number;
  /** Filtra por slugs exatos (ex.: favoritos). */
  slugs?: string[];
};

const CATEGORY_LABELS: Record<MarketplaceServiceCategory, string> = {
  CORTE: "Corte",
  BARBA: "Barba",
  COMBO: "Combo",
  TRATAMENTO: "Tratamento",
  OUTRO: "Outro",
};

export const MARKETPLACE_CATEGORY_CHIPS: {
  id: MarketplaceServiceCategory | "";
  label: string;
}[] = [
  { id: "", label: "Todos" },
  { id: "CORTE", label: "Corte" },
  { id: "BARBA", label: "Barba" },
  { id: "COMBO", label: "Combo" },
  { id: "TRATAMENTO", label: "Tratamento" },
];

export function marketplaceCategoryLabel(
  category: MarketplaceServiceCategory,
): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function parseMarketplaceCategory(
  raw: string | undefined,
): MarketplaceServiceCategory | undefined {
  if (!raw) return undefined;
  const up = raw.trim().toUpperCase();
  if (
    up === "CORTE" ||
    up === "BARBA" ||
    up === "COMBO" ||
    up === "TRATAMENTO" ||
    up === "OUTRO"
  ) {
    return up;
  }
  return undefined;
}

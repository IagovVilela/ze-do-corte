import "server-only";

import {
  cityMatchesQuery,
  resolveFuzzyCityMatches,
} from "@/lib/city-fuzzy";
import { prisma } from "@/lib/prisma";
import {
  parseMarketplaceCategory,
  type MarketplaceSearchInput,
  type MarketplaceShop,
} from "@/lib/marketplace-shared";

export type {
  MarketplaceShop,
  MarketplaceShopService,
  MarketplaceSearchInput,
} from "@/lib/marketplace-shared";

export {
  MARKETPLACE_CATEGORY_CHIPS,
  marketplaceCategoryLabel,
} from "@/lib/marketplace-shared";

async function knownMarketplaceCities(): Promise<string[]> {
  const rows = await prisma.barbershopUnit.findMany({
    where: {
      isActive: true,
      city: { not: null },
      organization: {
        marketplaceListed: true,
        planStatus: { in: ["TRIAL", "ACTIVE"] },
      },
    },
    select: { city: true },
    take: 800,
  });
  const set = new Set<string>();
  for (const r of rows) {
    const c = r.city?.trim();
    if (c) set.add(c);
  }
  return [...set];
}

/**
 * Lista organizações visíveis no marketplace público.
 * Cidade: fuzzy sem depender de ILIKE com acento (ex.: "sao" → "São José dos Campos").
 */
export async function searchMarketplaceShops(
  input: MarketplaceSearchInput = {},
): Promise<MarketplaceShop[]> {
  const q = input.q?.trim() || "";
  const cityRaw = input.city?.trim() || "";
  const category = parseMarketplaceCategory(input.category);
  const slugs = (input.slugs ?? [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 80);
  const limit = Math.min(Math.max(input.limit ?? 48, 1), 100);

  // Amplia o take no SQL quando há cidade: filtra de verdade em memória (acentos/parcial).
  const sqlTake = cityRaw.length >= 2 ? Math.min(200, limit * 4) : limit;

  let cityIn: string[] | null = null;
  if (cityRaw.length >= 2) {
    const known = await knownMarketplaceCities();
    const fuzzy = resolveFuzzyCityMatches(cityRaw, known);
    if (fuzzy.length > 0) cityIn = fuzzy;
  }

  const orgs = await prisma.organization.findMany({
    where: {
      marketplaceListed: true,
      planStatus: { in: ["TRIAL", "ACTIVE"] },
      ...(slugs.length > 0 ? { slug: { in: slugs } } : {}),
      AND: [
        {
          units: {
            some: {
              isActive: true,
              ...(cityIn ? { city: { in: cityIn } } : {}),
              services: {
                some: {
                  isActive: true,
                  ...(category ? { category } : {}),
                },
              },
            },
          },
        },
        ...(q
          ? [
              {
                OR: [
                  { name: { contains: q, mode: "insensitive" as const } },
                  { slogan: { contains: q, mode: "insensitive" as const } },
                  {
                    units: {
                      some: {
                        isActive: true,
                        services: {
                          some: {
                            isActive: true,
                            OR: [
                              {
                                name: {
                                  contains: q,
                                  mode: "insensitive" as const,
                                },
                              },
                              {
                                description: {
                                  contains: q,
                                  mode: "insensitive" as const,
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      heroMediaUrl: true,
      primaryColor: true,
      slogan: true,
      ratingAvg: true,
      ratingCount: true,
      units: {
        where: { isActive: true },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        select: {
          name: true,
          city: true,
          addressLine: true,
          isDefault: true,
          services: {
            where: {
              isActive: true,
              ...(category ? { category } : {}),
            },
            orderBy: { name: "asc" },
            take: 8,
            select: {
              id: true,
              name: true,
              category: true,
              price: true,
            },
          },
        },
      },
    },
    orderBy: [{ ratingCount: "desc" }, { name: "asc" }],
    take: sqlTake,
  });

  let shops: MarketplaceShop[] = [];
  for (const org of orgs) {
    // Preferir unidade cuja cidade casa com a busca (quando houver)
    const withServices = org.units.filter((u) => u.services.length > 0);
    const preferred =
      (cityRaw.length >= 2
        ? withServices.find((u) => cityMatchesQuery(cityRaw, u.city))
        : undefined) ??
      withServices.find((u) => u.isDefault) ??
      withServices[0] ??
      org.units[0];
    if (!preferred || preferred.services.length === 0) continue;

    shops.push({
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      heroMediaUrl: org.heroMediaUrl,
      primaryColor: org.primaryColor,
      slogan: org.slogan,
      city: preferred.city,
      addressLine: preferred.addressLine,
      unitName: preferred.name,
      ratingAvg: org.ratingAvg != null ? Number(org.ratingAvg) : null,
      ratingCount: org.ratingCount,
      services: preferred.services.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        price: Number(s.price),
      })),
    });
  }

  if (cityRaw.length >= 2) {
    shops = shops.filter((s) => cityMatchesQuery(cityRaw, s.city));
  }

  if (slugs.length > 0) {
    const order = new Map(slugs.map((s, i) => [s, i]));
    shops.sort(
      (a, b) => (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999),
    );
  }

  return shops.slice(0, limit);
}

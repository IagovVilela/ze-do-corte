import "server-only";

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

/**
 * Lista organizações visíveis no marketplace público.
 * Critérios: opt-in, plano TRIAL/ACTIVE, ao menos 1 unidade ativa + 1 serviço ativo.
 */
export async function searchMarketplaceShops(
  input: MarketplaceSearchInput = {},
): Promise<MarketplaceShop[]> {
  const q = input.q?.trim() || "";
  const city = input.city?.trim() || "";
  const category = parseMarketplaceCategory(input.category);
  const slugs = (input.slugs ?? [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 80);
  const limit = Math.min(Math.max(input.limit ?? 48, 1), 100);

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
              ...(city
                ? { city: { contains: city, mode: "insensitive" } }
                : {}),
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
    take: limit,
  });

  const shops: MarketplaceShop[] = [];
  for (const org of orgs) {
    const preferred =
      org.units.find((u) => u.isDefault && u.services.length > 0) ??
      org.units.find((u) => u.services.length > 0) ??
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

  if (slugs.length > 0) {
    const order = new Map(slugs.map((s, i) => [s, i]));
    shops.sort(
      (a, b) => (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999),
    );
  }

  return shops;
}

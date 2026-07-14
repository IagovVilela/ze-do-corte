import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

export type OrganizationPublic = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  slogan: string | null;
  sloganSecondary: string | null;
  heroMediaUrl: string | null;
  aboutText: string | null;
  instagramHref: string | null;
  whatsappHref: string | null;
  phoneLabel: string | null;
  timezone: string;
  siteJson: unknown;
};

export const orgSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  primaryColor: true,
  slogan: true,
  sloganSecondary: true,
  heroMediaUrl: true,
  aboutText: true,
  instagramHref: true,
  whatsappHref: true,
  phoneLabel: true,
  timezone: true,
  siteJson: true,
} as const;

async function loadOrganizationBySlug(
  slug: string,
): Promise<OrganizationPublic | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  return prisma.organization.findUnique({
    where: { slug: normalized },
    select: orgSelect,
  });
}

/** Uma query por request quando layout + page pedem a mesma org. */
export const getOrganizationBySlug = cache(loadOrganizationBySlug);

export async function getOrganizationById(
  id: string,
): Promise<OrganizationPublic | null> {
  return prisma.organization.findUnique({
    where: { id },
    select: orgSelect,
  });
}

/** Slugs reservados que não podem ser usados como tenant. */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "cadastro",
  "login",
  "minha-reserva",
  "agendar",
  "docs",
  "static",
  "assets",
  "barbernegon",
  "www",
  "app",
  "planos",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.trim().toLowerCase());
}

export function slugifyOrgName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "barbearia";
}

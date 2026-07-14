import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TenantCanvasRenderer } from "@/components/tenant-canvas-renderer";
import {
  getPublicBarbers,
  getPublicBarbershopUnits,
  getServices,
} from "@/lib/data";
import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";
import { orgDisplaySlogan, resolveSiteCanvas } from "@/lib/org-branding";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return { title: "Barbearia" };
  const slogans = orgDisplaySlogan(org);
  return {
    title: `${org.name} | ${slogans.primary}`,
    description: `${slogans.primary}. ${slogans.secondary}`,
  };
}

export default async function TenantHomePage({ params }: Props) {
  const { slug } = await params;
  if (isReservedSlug(slug)) notFound();
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();

  const [services, barbers, units] = await Promise.all([
    getServices(org.id),
    getPublicBarbers(org.id),
    getPublicBarbershopUnits(org.id),
  ]);

  const canvas = resolveSiteCanvas(org);
  const slogans = orgDisplaySlogan(org);

  return (
    <TenantCanvasRenderer
      org={org}
      canvas={canvas}
      services={services}
      barbers={barbers}
      units={units}
      slogans={slogans}
    />
  );
}

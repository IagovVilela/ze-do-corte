import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";
import { orgDisplaySlogan, organizationBrandStyle } from "@/lib/org-branding";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return { title: "Barbearia" };
  const slogans = orgDisplaySlogan(org);
  return {
    title: {
      default: `${org.name} | ${slogans.primary}`,
      template: `%s | ${org.name}`,
    },
    description: `${slogans.primary}. ${slogans.secondary}`,
    icons: org.logoUrl
      ? {
          icon: [{ url: org.logoUrl }],
          apple: org.logoUrl,
        }
      : undefined,
  };
}

export default async function TenantLayout({ children, params }: Props) {
  const { slug } = await params;
  if (isReservedSlug(slug)) notFound();
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();

  return (
    <div style={organizationBrandStyle(org)} className="flex min-h-full flex-1 flex-col">
      {children}
    </div>
  );
}

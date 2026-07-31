import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PwaInstallButton } from "@/components/pwa-install-button";
import { PwaRegister } from "@/components/pwa-register";
import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";
import { orgDisplaySlogan, organizationBrandStyle } from "@/lib/org-branding";
import { tenantPwaManifestPath } from "@/lib/pwa-manifest";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return { title: "Barbearia" };
  const slogans = orgDisplaySlogan(org);
  const manifestPath = tenantPwaManifestPath(org.slug);
  return {
    title: {
      default: `${org.name} | ${slogans.primary}`,
      template: `%s | ${org.name}`,
    },
    description: `${slogans.primary}. ${slogans.secondary}`,
    applicationName: org.name,
    manifest: manifestPath,
    appleWebApp: {
      capable: true,
      title: org.name,
      statusBarStyle: "black-translucent",
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
    icons: org.logoUrl
      ? {
          icon: [{ url: org.logoUrl }],
          apple: org.logoUrl,
        }
      : {
          icon: [{ url: "/images/barbernegon-logo.png", type: "image/png" }],
          apple: "/images/barbernegon-logo.png",
        },
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
      <PwaRegister />
      {/* Atalho fixo (mesmo padrão do painel) — cobre site canvas sem rodapé. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-end px-3 sm:px-5">
        <div className="pointer-events-auto">
          <PwaInstallButton variant="public" />
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AnimatedSection } from "@/components/animated-section";
import { HomeBarbersGrid } from "@/components/home-barbers-grid";
import { HomeContactGrid } from "@/components/home-contact-grid";
import { HomeDifferentials } from "@/components/home-differentials";
import { HomeServicesGrid } from "@/components/home-services-grid";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { SectionTitle } from "@/components/section-title";
import { SiteFooter } from "@/components/site-footer";
import {
  getPublicBarbers,
  getPublicBarbershopUnits,
  getServices,
} from "@/lib/data";
import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";
import { orgDisplaySlogan } from "@/lib/org-branding";

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
  const slogans = orgDisplaySlogan(org);
  const homeHref = `/${org.slug}`;
  const bookHref = `/${org.slug}/agendar`;

  return (
    <div className="relative overflow-hidden">
      <Navbar
        brandName={org.name}
        logoUrl={org.logoUrl}
        homeHref={homeHref}
        bookHref={bookHref}
        whatsappHref={org.whatsappHref}
        instagramHref={org.instagramHref}
      />
      <main className="pb-24">
        <Hero
          brandName={org.name}
          slogan={slogans.primary}
          bookHref={bookHref}
          heroMediaUrl={org.heroMediaUrl}
          supportingText={slogans.secondary}
        />

        <AnimatedSection id="servicos" className="container-max py-20">
          <SectionTitle
            eyebrow="Serviços"
            title="Pacotes e experiências sob medida"
            description="Escolha o que faz sentido para seu estilo."
          />
          <HomeServicesGrid services={services} />
        </AnimatedSection>

        {barbers.length > 0 ? (
          <AnimatedSection id="equipe" className="container-max py-20">
            <SectionTitle
              eyebrow="Equipe"
              title="Quem cuida do seu estilo"
              description="Profissionais da casa com identidade própria."
            />
            <HomeBarbersGrid barbers={barbers} />
          </AnimatedSection>
        ) : null}

        <AnimatedSection id="sobre" className="container-max py-16">
          <SectionTitle
            eyebrow="Sobre"
            title={org.aboutText ? org.name : "Mais do que um corte"}
            description={
              org.aboutText?.trim() ||
              "Design, técnica e atendimento em alto padrão."
            }
          />
          {!org.aboutText ? <HomeDifferentials /> : null}
        </AnimatedSection>

        <AnimatedSection id="contato" className="container-max py-16">
          <SectionTitle
            eyebrow="Contato"
            title={`Venha conhecer a ${org.name}`}
            description={slogans.secondary}
          />
          <HomeContactGrid units={units} />
        </AnimatedSection>
      </main>
      <SiteFooter
        brandName={org.name}
        pitch={slogans.secondary}
        logoUrl={org.logoUrl}
        whatsappHref={org.whatsappHref}
        instagramHref={org.instagramHref}
      />
    </div>
  );
}

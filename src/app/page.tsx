import { AnimatedSection } from "@/components/animated-section";
import { HomeContactGrid } from "@/components/home-contact-grid";
import { HomeDifferentials } from "@/components/home-differentials";
import { HomeServicesGrid } from "@/components/home-services-grid";
import { Hero } from "@/components/hero";
import { HomeEntrance } from "@/components/home-entrance";
import { Navbar } from "@/components/navbar";
import { SectionTitle } from "@/components/section-title";
import { SiteFooter } from "@/components/site-footer";
import { BARBER_SLOGAN_SECONDARY } from "@/lib/constants";
import { getServices } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const services = await getServices();

  return (
    <HomeEntrance>
      <div className="relative overflow-hidden">
        <Navbar />
        <main className="pb-24">
          <Hero />

          <AnimatedSection id="servicos" className="container-max py-20">
            <SectionTitle
              eyebrow="Serviços"
              title="Pacotes e experiências sob medida"
              description="Escolha o que faz sentido para seu estilo. Cada serviço foi desenhado para unir visual impecável e praticidade."
            />
            <HomeServicesGrid services={services} />
          </AnimatedSection>

          <AnimatedSection id="sobre" className="container-max py-16">
            <SectionTitle
              eyebrow="Diferenciais"
              title="Mais do que um corte: uma experiência"
              description="Design, técnica e atendimento em alto padrão para fidelizar clientes e elevar sua presença."
            />
            <HomeDifferentials />
          </AnimatedSection>

          <AnimatedSection id="contato" className="container-max py-16">
            <SectionTitle
              eyebrow="Contato"
              title="Venha conhecer a Zé do Corte"
              description={`${BARBER_SLOGAN_SECONDARY} Ambiente moderno e atendimento humanizado em São José dos Campos.`}
            />
            <HomeContactGrid />
          </AnimatedSection>
        </main>
        <SiteFooter />
      </div>
    </HomeEntrance>
  );
}

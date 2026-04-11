import { AnimatedSection } from "@/components/animated-section";
import { HomeBarbersGrid } from "@/components/home-barbers-grid";
import { HomeContactGrid } from "@/components/home-contact-grid";
import { HomeDifferentials } from "@/components/home-differentials";
import { HomeServicesGrid } from "@/components/home-services-grid";
import { Hero } from "@/components/hero";
import { HomeEntrance } from "@/components/home-entrance";
import { Navbar } from "@/components/navbar";
import { SectionTitle } from "@/components/section-title";
import { SiteFooter } from "@/components/site-footer";
import { BARBER_SLOGAN_SECONDARY } from "@/lib/constants";
import { getPublicBarbers, getServices } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [services, barbers] = await Promise.all([getServices(), getPublicBarbers()]);

  return (
    <HomeEntrance>
      <Navbar />
      <div className="relative overflow-x-clip">
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

          {barbers.length > 0 ? (
            <AnimatedSection id="equipe" className="container-max py-20">
              <SectionTitle
                eyebrow="Equipe"
                title="Quem cuida do seu estilo"
                description="Cada profissional tem um cartão com identidade visual própria; a apresentação e a foto são definidas pela equipe para refletir o estilo de cada um."
              />
              <HomeBarbersGrid barbers={barbers} />
            </AnimatedSection>
          ) : null}

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

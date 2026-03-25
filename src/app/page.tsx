import { AnimatedSection } from "@/components/animated-section";
import { ContactCard } from "@/components/contact-card";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { SectionTitle } from "@/components/section-title";
import { ServiceCard } from "@/components/service-card";
import { SiteFooter } from "@/components/site-footer";
import { getServices } from "@/lib/data";
import { ShieldCheck, Sparkles, Timer } from "lucide-react";

export const dynamic = "force-dynamic";

const differentials = [
  {
    title: "Atendimento premium",
    description:
      "Recepção personalizada, ambiente confortável e experiência completa em cada visita.",
    icon: Sparkles,
  },
  {
    title: "Pontualidade e precisão",
    description:
      "Agenda inteligente para evitar esperas desnecessárias e garantir atendimento no horário.",
    icon: Timer,
  },
  {
    title: "Profissionais especialistas",
    description:
      "Equipe experiente em cortes modernos, barba desenhada e consultoria de estilo.",
    icon: ShieldCheck,
  },
];

export default async function Home() {
  const services = await getServices();

  return (
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
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection id="sobre" className="container-max py-16">
          <SectionTitle
            eyebrow="Diferenciais"
            title="Mais do que um corte: uma experiência"
            description="Design, técnica e atendimento em alto padrão para fidelizar clientes e elevar sua presença."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {differentials.map((item) => (
              <article key={item.title} className="glass-card rounded-2xl p-6">
                <item.icon className="h-8 w-8 text-brand-300" />
                <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-300">{item.description}</p>
              </article>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection id="contato" className="container-max py-16">
          <SectionTitle
            eyebrow="Contato"
            title="Venha conhecer a Zé do Corte"
            description="Estamos prontos para te receber em um ambiente moderno com atendimento humanizado."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <ContactCard
              title="Localização"
              subtitle="Rua das Tesouras, 237 - Centro, São Paulo - SP"
            />
            <ContactCard
              title="Horário de funcionamento"
              subtitle="Seg a Sex: 09h às 20h | Sáb: 09h às 18h"
            />
          </div>
        </AnimatedSection>
      </main>
      <SiteFooter />
    </div>
  );
}

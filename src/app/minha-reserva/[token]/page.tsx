import { notFound } from "next/navigation";

import { ManageReservationClient } from "@/components/manage-reservation-client";
import { isClientManageTokenFormat } from "@/lib/client-manage-token";
import { AnimatedSection } from "@/components/animated-section";
import { SectionTitle } from "@/components/section-title";

type PageProps = { params: Promise<{ token: string }> };

export default async function MinhaReservaPage({ params }: PageProps) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw).trim();
  if (!isClientManageTokenFormat(token)) {
    notFound();
  }

  return (
    <main className="flex-1">
      <section className="container-max pt-8 pb-4 md:pt-10">
        <AnimatedSection>
          <SectionTitle
            eyebrow="Reserva"
            title="Gerir agendamento"
            subtitle="Altere o horário ou cancele sem criar conta — o link que você recebeu após reservar é a sua chave de acesso."
          />
        </AnimatedSection>
      </section>
      <section className="container-max pb-16">
        <ManageReservationClient token={token} />
      </section>
    </main>
  );
}

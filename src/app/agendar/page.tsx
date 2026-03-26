import { BookingForm } from "@/components/booking-form";
import { DatabaseUnavailableNotice } from "@/components/database-unavailable-notice";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { BARBER_SLOGAN_PRIMARY } from "@/lib/constants";
import { getServices } from "@/lib/data";

export const metadata = {
  title: "Agendar horário | Zé do Corte",
  description: `${BARBER_SLOGAN_PRIMARY}. Escolha data, horário e serviço em poucos passos.`,
};

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const services = await getServices();

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-16">
        <section className="container-max py-12 md:py-16">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-300">
              Agendamento online
            </p>
            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              Seu horário em poucos cliques
            </h1>
            <p className="mt-4 text-zinc-300">
              Selecione o serviço, informe seus dados e confirme o melhor horário
              para você.
            </p>
          </div>

          {services.length === 0 ? (
            <DatabaseUnavailableNotice variant="compact" />
          ) : (
            <BookingForm services={services} />
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

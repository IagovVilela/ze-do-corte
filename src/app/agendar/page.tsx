import { BookingForm } from "@/components/booking-form";
import { DatabaseUnavailableNotice } from "@/components/database-unavailable-notice";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { BARBER_SLOGAN_PRIMARY } from "@/lib/constants";
import { getBarbersForBooking, getServices } from "@/lib/data";

export const metadata = {
  title: "Agendar horário | Zé do Corte",
  description: `${BARBER_SLOGAN_PRIMARY}. Escolha data, horário e serviço em poucos passos.`,
};

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const [services, barbers] = await Promise.all([
    getServices(),
    getBarbersForBooking(),
  ]);

  return (
    <>
      <Navbar />
      <main className="flex-1 overflow-x-clip pb-16">
        <section className="container-max min-w-0 py-10 md:py-14">
          <div className="relative mb-10 max-w-3xl">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-4 -inset-y-3 rounded-3xl bg-gradient-to-br from-brand-500/10 via-transparent to-blue-500/5 blur-2xl md:-inset-x-8"
            />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-300">
                Agendamento online
              </p>
              <h1 className="font-display mt-3 text-4xl font-bold leading-[1.05] tracking-wide text-white md:text-5xl">
                Seu horário em poucos cliques
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
                Escolha o serviço e o melhor horário; em seguida informe seus dados para
                confirmar.
              </p>
            </div>
          </div>

          {services.length === 0 ? (
            <DatabaseUnavailableNotice variant="compact" />
          ) : (
            <BookingForm services={services} barbers={barbers} />
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

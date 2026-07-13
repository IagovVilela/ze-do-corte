import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingForm } from "@/components/booking-form";
import { DatabaseUnavailableNotice } from "@/components/database-unavailable-notice";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import {
  getBarbersForBooking,
  getPublicBarbershopUnits,
  getServicesForBooking,
} from "@/lib/data";
import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";
import { orgDisplaySlogan } from "@/lib/org-branding";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return { title: "Agendar" };
  const slogans = orgDisplaySlogan(org);
  return {
    title: "Agendar horário",
    description: `${slogans.primary}. Escolha data, horário e serviço em poucos passos.`,
  };
}

export default async function TenantBookingPage({ params }: Props) {
  const { slug } = await params;
  if (isReservedSlug(slug)) notFound();
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();

  const [services, barbers, units] = await Promise.all([
    getServicesForBooking(org.id),
    getBarbersForBooking(org.id),
    getPublicBarbershopUnits(org.id),
  ]);

  const slogans = orgDisplaySlogan(org);
  const homeHref = `/${org.slug}`;
  const bookHref = `/${org.slug}/agendar`;

  return (
    <>
      <Navbar
        brandName={org.name}
        logoUrl={org.logoUrl}
        homeHref={homeHref}
        bookHref={bookHref}
        whatsappHref={org.whatsappHref}
        instagramHref={org.instagramHref}
      />
      <main className="flex-1 overflow-x-clip pb-16">
        <section className="container-max min-w-0 py-10 md:py-14">
          <div className="relative mb-10 max-w-3xl">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-4 -inset-y-3 rounded-3xl bg-gradient-to-br from-brand-500/10 via-transparent to-blue-500/5 blur-2xl md:-inset-x-8"
            />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-300">
                Agendamento online · {org.name}
              </p>
              <h1 className="font-display mt-3 text-4xl font-bold leading-[1.05] tracking-wide text-white md:text-5xl">
                Seu horário em poucos cliques
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
                {slogans.secondary} Escolha o serviço e o melhor horário; em
                seguida informe seus dados para confirmar.
              </p>
            </div>
          </div>

          {services.length === 0 ? (
            <DatabaseUnavailableNotice variant="compact" />
          ) : (
            <BookingForm
              services={services}
              barbers={barbers}
              units={units}
              organizationSlug={org.slug}
            />
          )}
        </section>
      </main>
      <SiteFooter
        brandName={org.name}
        pitch={slogans.secondary}
        logoUrl={org.logoUrl}
        whatsappHref={org.whatsappHref}
        instagramHref={org.instagramHref}
      />
    </>
  );
}

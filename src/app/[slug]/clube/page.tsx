import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClubPublicJoin } from "@/components/club-public-join";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import {
  listPublicClubPlans,
  orgClubPublicAvailable,
} from "@/lib/club-subscribe";
import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";
import { orgDisplaySlogan } from "@/lib/org-branding";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return { title: "Clube" };
  return {
    title: `Clube · ${org.name}`,
    description: `Assine o clube de ${org.name} e use créditos no agendamento.`,
  };
}

export default async function TenantClubPage({ params }: Props) {
  const { slug } = await params;
  if (isReservedSlug(slug)) notFound();
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();

  const avail = await orgClubPublicAvailable(org.id);
  const rawPlans = avail.ok ? await listPublicClubPlans(org.id) : [];
  const plans = rawPlans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    priceLabel: formatMoney(Number(p.price)),
    cycleDays: p.cycleDays,
    visitsIncluded: p.visitsIncluded,
    services: p.services.map((s) => s.service.name),
  }));

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
        phoneLabel={org.phoneLabel}
        whatsappHref={org.whatsappHref}
        instagramHref={org.instagramHref}
      />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-24 sm:pt-28">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
          Clube
        </p>
        <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">
          Assine e agende com crédito
        </h1>
        <p className="mt-3 max-w-xl text-sm text-zinc-400">
          {slogans.primary} Pague o PIX do plano, e use o{" "}
          <strong className="font-medium text-zinc-200">mesmo telefone</strong>{" "}
          no{" "}
          <Link href={bookHref} className="text-brand-200 underline">
            agendamento
          </Link>{" "}
          — o crédito entra sozinho nos serviços inclusos.
        </p>

        <div className="mt-10">
          {!avail.ok ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-6 text-sm text-amber-100">
              <p className="font-semibold">Clube indisponível no momento</p>
              <p className="mt-2 text-amber-100/80">{avail.message}</p>
              <Link
                href={bookHref}
                className="mt-4 inline-block text-brand-200 underline"
              >
                Ir para agendar
              </Link>
            </div>
          ) : (
            <ClubPublicJoin
              slug={org.slug}
              orgName={org.name}
              plans={plans}
              bookHref={bookHref}
            />
          )}
        </div>
      </main>
      <SiteFooter showPitch={false} />
    </>
  );
}

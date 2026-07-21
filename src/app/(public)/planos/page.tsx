import Link from "next/link";

import { SaasPlanComparison } from "@/components/saas-plan-comparison";

export const metadata = {
  title: "Planos | Barbernegon",
  description:
    "Free forever + Pro: site, agenda, caixa e clube. 1 mês grátis com tudo do Pro (3 meses na oferta de lançamento).",
};

export default function PlanosPage() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(59,130,246,0.18),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-4xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20">
        <span className="mb-3 block text-[11px] font-bold tracking-[0.1em] text-[var(--bn-primary)] uppercase sm:text-[12px]">
          Assinatura
        </span>
        <h1 className="font-brand-headline text-3xl font-bold tracking-tight text-[var(--bn-on)] sm:text-4xl md:text-5xl">
          Planos claros. Você sabe o que está pagando.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--bn-on-variant)] sm:text-base">
          Assinatura da plataforma (site + painel). O dinheiro do corte e do
          clube dos clientes cai na{" "}
          <span className="text-[var(--bn-on)]">sua</span> conta Asaas —
          separado da mensalidade Barbernegon.
        </p>

        <div className="mt-10 sm:mt-12">
          <SaasPlanComparison showCta ctaHref="/cadastro" />
        </div>

        <p className="mt-10 text-center text-sm text-[var(--bn-muted)] sm:text-left">
          Já tem conta?{" "}
          <Link
            href="/admin/plano"
            className="font-medium text-[var(--bn-primary)] underline-offset-2 hover:underline"
          >
            Assine no painel
          </Link>
        </p>
      </div>
    </div>
  );
}

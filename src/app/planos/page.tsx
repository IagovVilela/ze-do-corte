import Link from "next/link";

import { SaasPlanComparison } from "@/components/saas-plan-comparison";

export const metadata = {
  title: "Planos | Barbernegon",
  description:
    "Starter e Pro: site, agenda, caixa e clube para a sua barbearia. 14 dias grátis com tudo do Pro.",
};

export default function PlanosPage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-[#0f1419] text-[#e2eaf4]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_15%_-5%,rgba(59,130,246,0.22),transparent_55%)]"
      />
      <div className="relative mx-auto max-w-4xl px-4 py-16">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-[#8eb6ff]"
        >
          Barbernegon
        </Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight text-white md:text-5xl">
          Planos claros. Você sabe o que está pagando.
        </h1>
        <p className="mt-3 max-w-2xl text-[#a8b6c9]">
          Assinatura da plataforma (site + painel). O dinheiro do corte e do
          clube dos clientes cai na{" "}
          <span className="text-zinc-200">sua</span> conta Asaas — separado da
          mensalidade Barbernegon.
        </p>

        <div className="mt-12">
          <SaasPlanComparison showCta ctaHref="/cadastro" />
        </div>

        <p className="mt-10 text-sm text-[#7a889c]">
          Já tem conta?{" "}
          <Link href="/admin/plano" className="text-[#8eb6ff] underline">
            Assine em /admin/plano
          </Link>
        </p>
      </div>
    </div>
  );
}

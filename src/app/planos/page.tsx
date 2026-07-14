import Link from "next/link";

import { SAAS_PLANS } from "@/lib/asaas-plans";
import { formatMoney } from "@/lib/utils";

export const metadata = {
  title: "Planos | Barbernegon",
  description: "Planos da plataforma Barbernegon para donos de barbearia.",
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
          Planos da plataforma
        </h1>
        <p className="mt-3 max-w-xl text-[#a8b6c9]">
          Assinatura do dono ao Barbernegon — separada do clube de clientes e dos
          PIX da barbearia. Cobrança via Asaas (PIX). O trial libera o produto
          completo.
        </p>

        <ul className="mt-12 grid gap-6 md:grid-cols-2">
          {SAAS_PLANS.map((plan) => (
            <li
              key={plan.id}
              className={
                plan.id === "pro"
                  ? "rounded-2xl border border-[#3b82f6]/40 bg-[#3b82f6]/10 p-6"
                  : "rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              }
            >
              <h2 className="text-2xl font-semibold text-white">{plan.name}</h2>
              <p className="mt-1 text-sm text-[#a8b6c9]">{plan.blurb}</p>
              <p className="mt-4 text-3xl font-bold text-[#8eb6ff]">
                {formatMoney(plan.priceMonthly)}
                <span className="text-base font-medium text-[#7a889c]">/mês</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[#c5d0e0]">
                {plan.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <Link
                href="/cadastro"
                className="mt-6 inline-flex rounded-full bg-[#3b82f6] px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_-6px_rgba(59,130,246,0.5)] transition hover:bg-[#2563eb]"
              >
                Começar trial
              </Link>
            </li>
          ))}
        </ul>

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

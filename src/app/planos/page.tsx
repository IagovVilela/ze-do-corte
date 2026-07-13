import Link from "next/link";

import { formatMoney } from "@/lib/utils";

export const metadata = {
  title: "Planos | Barbernegon",
  description: "Planos da plataforma Barbernegon para donos de barbearia.",
};

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 79,
    blurb: "Site white-label, agendamento e admin.",
    features: ["Site /sua-marca", "Agendamento online", "Painel e equipe"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 129,
    blurb: "Tudo do Starter + caixa e clube de assinaturas.",
    features: ["Relatório de caixa", "Clube com cancelamento claro", "Prioridade no roadmap"],
    highlight: true,
  },
];

export default function PlanosPage() {
  return (
    <div className="min-h-svh bg-[#0a0908] text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <Link href="/" className="font-display text-xl tracking-wide text-[#e8d5b5]">
          Barbernegon
        </Link>
        <h1 className="font-display mt-8 text-4xl tracking-wide text-white md:text-5xl">
          Planos da plataforma
        </h1>
        <p className="mt-3 max-w-xl text-zinc-400">
          Assinatura do dono ao Barbernegon — separada do clube de clientes da sua barbearia.
          Gateway de pagamento em breve; o trial libera o produto completo.
        </p>

        <ul className="mt-12 grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className={
                plan.highlight
                  ? "rounded-2xl border border-[#c4a574]/40 bg-[#c4a574]/10 p-6"
                  : "rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              }
            >
              <h2 className="font-display text-2xl text-white">{plan.name}</h2>
              <p className="mt-1 text-sm text-zinc-400">{plan.blurb}</p>
              <p className="mt-4 font-display text-3xl text-[#e8d5b5]">
                {formatMoney(plan.price)}
                <span className="text-base text-zinc-500">/mês</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {plan.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <Link
                href="/cadastro"
                className="mt-6 inline-flex rounded-full bg-gradient-to-r from-[#c4a574] to-[#a8895a] px-5 py-2.5 text-sm font-bold text-zinc-950"
              >
                Começar trial
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

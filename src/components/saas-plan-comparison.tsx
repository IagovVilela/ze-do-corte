import Link from "next/link";

import {
  SAAS_PLANS,
  SAAS_TRIAL_COPY,
  type SaasPlanId,
} from "@/lib/asaas-plans";
import { cn, formatMoney } from "@/lib/utils";

type Props = {
  /** Destaque o plano atual do salão */
  currentPlanId?: SaasPlanId | null;
  /** Trial ativo = acesso Pro liberado */
  trialActive?: boolean;
  /** Links de CTA (marketing usa cadastro; admin omite se false) */
  showCta?: boolean;
  ctaHref?: string;
  className?: string;
};

export function SaasPlanComparison({
  currentPlanId = null,
  trialActive = false,
  showCta = true,
  ctaHref = "/cadastro",
  className,
}: Props) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        <p className="font-semibold text-emerald-50">{SAAS_TRIAL_COPY.title}</p>
        <p className="mt-1 text-emerald-100/80">{SAAS_TRIAL_COPY.body}</p>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {SAAS_PLANS.map((plan) => {
          const isCurrent =
            !trialActive &&
            currentPlanId != null &&
            currentPlanId === plan.id;
          const isPro = plan.id === "pro";

          return (
            <li
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border p-5 sm:p-6",
                isPro
                  ? "border-brand-500/45 bg-brand-500/10 shadow-[0_0_40px_-20px_rgba(59,130,246,0.55)]"
                  : "border-white/10 bg-white/[0.03]",
                isCurrent && "ring-2 ring-brand-400/60",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-white">
                      {plan.name}
                    </h3>
                    {plan.badge ? (
                      <span className="rounded-full bg-brand-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-950">
                        {plan.badge}
                      </span>
                    ) : null}
                    {isCurrent ? (
                      <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-200">
                        Seu plano
                      </span>
                    ) : null}
                    {trialActive && isPro ? (
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
                        Liberado no trial
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm text-zinc-400">{plan.blurb}</p>
                </div>
              </div>

              <p className="mt-4 font-display text-3xl text-brand-200">
                {formatMoney(plan.priceMonthly)}
                <span className="text-base font-sans font-medium text-zinc-500">
                  /mês
                </span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">{plan.ctaHint}</p>

              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-zinc-200">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span
                      className="mt-0.5 shrink-0 text-brand-300"
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.notIncluded && plan.notIncluded.length > 0 ? (
                <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-sm text-zinc-500">
                  {plan.notIncluded.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="shrink-0" aria-hidden>
                        —
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {showCta ? (
                <Link
                  href={ctaHref}
                  className={cn(
                    "mt-6 inline-flex justify-center rounded-full px-5 py-2.5 text-center text-sm font-bold transition",
                    isPro
                      ? "bg-brand-400 text-zinc-950 hover:bg-brand-300"
                      : "border border-white/15 text-zinc-100 hover:bg-white/5",
                  )}
                >
                  {isPro ? "Começar com Pro (trial)" : "Começar grátis"}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

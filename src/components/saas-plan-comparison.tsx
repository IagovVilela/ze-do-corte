import Link from "next/link";

import {
  SAAS_FREE_PLAN,
  SAAS_PLANS,
  SAAS_TRIAL_COPY,
  type SaasPlanId,
} from "@/lib/asaas-plans";
import { cn, formatMoney } from "@/lib/utils";

type Props = {
  currentPlanId?: SaasPlanId | "free" | null;
  trialActive?: boolean;
  showCta?: boolean;
  ctaHref?: string;
  className?: string;
};

/**
 * Comparação Free / Pro — herda tokens `--bn-*` do pai.
 */
export function SaasPlanComparison({
  currentPlanId = null,
  trialActive = false,
  showCta = true,
  ctaHref = "/cadastro",
  className,
}: Props) {
  const cards = [
    {
      id: "free" as const,
      name: SAAS_FREE_PLAN.name,
      priceMonthly: SAAS_FREE_PLAN.priceMonthly,
      blurb: SAAS_FREE_PLAN.blurb,
      badge: SAAS_FREE_PLAN.badge,
      features: SAAS_FREE_PLAN.features,
      notIncluded: SAAS_FREE_PLAN.notIncluded,
      ctaHint: SAAS_FREE_PLAN.ctaHint,
      isPro: false,
    },
    ...SAAS_PLANS.map((plan) => ({
      id: plan.id,
      name: plan.name,
      priceMonthly: plan.priceMonthly,
      blurb: plan.blurb,
      badge: plan.badge,
      features: plan.features,
      notIncluded: plan.notIncluded,
      ctaHint: plan.ctaHint,
      isPro: true,
    })),
  ];

  return (
    <div className={cn("space-y-6", className)}>
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--bn-status-ok)]">
        <p className="font-semibold text-[var(--bn-status-ok)]">
          {SAAS_TRIAL_COPY.title}
        </p>
        <p className="mt-1 opacity-90">{SAAS_TRIAL_COPY.body}</p>
      </div>

      <ul className="grid items-stretch gap-4 md:grid-cols-2 md:gap-5">
        {cards.map((plan) => {
          const isCurrent =
            !trialActive &&
            currentPlanId != null &&
            currentPlanId === plan.id;
          const isPro = plan.isPro;
          const hasExcluded =
            Boolean(plan.notIncluded) && plan.notIncluded!.length > 0;

          return (
            <li
              key={plan.id}
              className={cn(
                "relative flex h-full flex-col rounded-xl border bg-[var(--bn-surface-elevated)] p-5 sm:p-6 bn-card",
                isPro
                  ? "border-[var(--bn-primary-container)]/55 shadow-[0_0_48px_-18px_rgba(59,130,246,0.35)]"
                  : "border-[var(--bn-border)]",
                isCurrent && "ring-2 ring-[var(--bn-primary)]/50",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-brand-headline text-xl font-semibold text-[var(--bn-on)]">
                  {plan.name}
                </h3>
                {plan.badge ? (
                  <span className="rounded-md bg-[var(--bn-primary-container)] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                    {plan.badge}
                  </span>
                ) : null}
                {isCurrent ? (
                  <span className="rounded-md border border-[var(--bn-border)] px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--bn-on-variant)] uppercase">
                    Seu plano
                  </span>
                ) : null}
                {trialActive && isPro ? (
                  <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--bn-status-ok)] uppercase">
                    Liberado no trial
                  </span>
                ) : null}
              </div>

              <p className="mt-1.5 min-h-[2.5rem] text-sm leading-snug text-[var(--bn-muted)]">
                {plan.blurb}
              </p>

              <p className="font-brand-headline mt-4 text-3xl font-bold tracking-tight text-[var(--bn-primary)]">
                {plan.priceMonthly === 0
                  ? "Grátis"
                  : formatMoney(plan.priceMonthly)}
                {plan.priceMonthly > 0 ? (
                  <span className="text-base font-sans font-medium text-[var(--bn-muted)]">
                    /mês
                  </span>
                ) : (
                  <span className="text-base font-sans font-medium text-[var(--bn-muted)]">
                    {" "}
                    para sempre
                  </span>
                )}
              </p>
              <p className="mt-1 min-h-[2rem] text-xs leading-snug text-[var(--bn-muted)]">
                {plan.ctaHint}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-[var(--bn-on-variant)]">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span
                      className="mt-0.5 shrink-0 text-[var(--bn-primary)]"
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-4">
                {hasExcluded ? (
                  <ul className="mb-5 space-y-1.5 border-t border-[var(--bn-border)] pt-4 text-sm text-[var(--bn-muted)]">
                    {plan.notIncluded!.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="shrink-0" aria-hidden>
                          —
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div
                    className="mb-5 border-t border-transparent pt-4"
                    aria-hidden
                  />
                )}

                {showCta ? (
                  <Link
                    href={ctaHref}
                    className={cn(
                      "inline-flex min-h-11 w-full items-center justify-center rounded-lg px-5 py-2.5 text-center text-sm font-bold transition active:scale-[0.98]",
                      isPro
                        ? "bg-[var(--bn-primary-container)] text-white shadow-[0_0_24px_-8px_rgba(59,130,246,0.4)] hover:brightness-110"
                        : "border border-[var(--bn-border)] bg-transparent text-[var(--bn-on)] hover:border-[var(--bn-primary)]/40 hover:bg-[var(--bn-hover)]",
                    )}
                  >
                    {isPro ? "Começar (60 dias Pro)" : "Começar grátis"}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

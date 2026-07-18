import Link from "next/link";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { StaffAccess } from "@/lib/staff-access";
import { cn } from "@/lib/utils";

export type OnboardingFlags = {
  logo?: boolean;
  unit?: boolean;
  service?: boolean;
  staff?: boolean;
  schedule?: boolean;
  branding?: boolean;
};

type ChecklistItem = {
  key: keyof OnboardingFlags;
  label: string;
  href: string;
  done: boolean;
};

export async function computeOnboardingChecklist(
  access: StaffAccess,
): Promise<ChecklistItem[]> {
  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: {
      logoUrl: true,
      slogan: true,
      primaryColor: true,
      heroMediaUrl: true,
      whatsappHref: true,
      instagramHref: true,
      onboardingJson: true,
      _count: {
        select: {
          units: true,
          staffMembers: true,
          subscriptionPlans: true,
        },
      },
    },
  });

  const [serviceCount, staffCount, staffWithSchedule] = await Promise.all([
    prisma.service.count({
      where: { unit: { organizationId: access.organizationId } },
    }),
    prisma.staffMember.count({
      where: { organizationId: access.organizationId, role: "STAFF" },
    }),
    prisma.staffMember.count({
      where: {
        organizationId: access.organizationId,
        role: "STAFF",
        workWeekJson: { not: Prisma.DbNull },
      },
    }),
  ]);

  const flags = (org?.onboardingJson ?? {}) as OnboardingFlags;
  const hasBrandBasics =
    Boolean(org?.logoUrl) ||
    Boolean(org?.primaryColor) ||
    Boolean(flags.logo) ||
    Boolean(flags.branding);
  const hasBrandPresence =
    Boolean(org?.slogan) ||
    Boolean(org?.heroMediaUrl) ||
    Boolean(org?.whatsappHref) ||
    Boolean(org?.instagramHref);

  return [
    {
      key: "logo",
      label: "Montar o site no canvas (e identidade)",
      href: "/admin/site",
      done: hasBrandBasics && (hasBrandPresence || Boolean(flags.branding)),
    },
    {
      key: "unit",
      label: "Confirmar unidade",
      href: "/admin/unidades",
      done: (org?._count.units ?? 0) > 0 || Boolean(flags.unit),
    },
    {
      key: "service",
      label: "Cadastrar pelo menos 1 serviço",
      href: "/admin/servicos",
      done: serviceCount > 0 || Boolean(flags.service),
    },
    {
      key: "staff",
      label: "Cadastrar pelo menos 1 barbeiro",
      href: "/admin/equipe",
      done: staffCount > 0 || Boolean(flags.staff),
    },
    {
      key: "schedule",
      label: "Revisar expediente da equipe",
      href: "/admin/equipe",
      done: staffWithSchedule > 0 || Boolean(flags.schedule),
    },
  ];
}

export function OnboardingChecklist({ items }: { items: ChecklistItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;
  const progress = Math.round((doneCount / items.length) * 100);

  return (
    <section className="bn-card rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.1em] text-[var(--bn-primary)] uppercase sm:text-[12px]">
            Primeiros passos
          </p>
          <h2 className="font-brand-headline mt-1 text-xl font-bold tracking-tight text-[var(--bn-on)] sm:text-2xl">
            Configure sua barbearia
          </h2>
          <p className="mt-1 text-sm text-[var(--bn-muted)]">
            {doneCount} de {items.length} concluídos — pronto em minutos.
          </p>
        </div>
        <span className="text-xs font-semibold text-[var(--bn-primary)]">
          {progress}%
        </span>
      </div>

      <div
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--bn-surface-container)]"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso do setup"
      >
        <div
          className="h-full rounded-full bg-[var(--bn-primary-container)] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="mt-5 space-y-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className={cn(
                "flex min-h-11 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition",
                item.done
                  ? "border-emerald-500/30 bg-emerald-500/10 text-[var(--bn-status-ok)]"
                  : "border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] text-[var(--bn-on)] hover:border-[var(--bn-primary)]/35 hover:bg-[var(--bn-primary-container)]/10",
              )}
            >
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    item.done
                      ? "bg-emerald-500/20 text-[var(--bn-status-ok)]"
                      : "bg-[var(--bn-surface-container)] text-[var(--bn-muted)]",
                  )}
                >
                  {item.done ? "✓" : ""}
                </span>
                {item.label}
              </span>
              <span className="shrink-0 text-xs font-medium text-[var(--bn-muted)]">
                {item.done ? "Feito" : "Abrir →"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

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

  return (
    <section className="rounded-2xl border border-brand-500/25 bg-gradient-to-br from-brand-500/10 via-transparent to-transparent p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            Primeiros passos
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-wide text-white">
            Configure sua barbearia
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {doneCount} de {items.length} concluídos — setup em minutos.
          </p>
        </div>
      </div>
      <ul className="mt-5 space-y-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition",
                item.done
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"
                  : "border-white/10 bg-white/[0.03] text-zinc-200 hover:border-brand-500/30 hover:bg-brand-500/5",
              )}
            >
              <span>{item.label}</span>
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                {item.done ? "ok" : "fazer"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

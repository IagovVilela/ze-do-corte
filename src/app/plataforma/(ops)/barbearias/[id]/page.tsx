import Link from "next/link";
import { notFound } from "next/navigation";

import { PlatformOrgEditor } from "@/components/plataforma/platform-org-editor";
import {
  planStatusLabel,
  planTierLabel,
} from "@/lib/org-entitlements";
import { getPlatformOrganizationDetail } from "@/lib/platform-ops";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function PlataformaBarbeariaDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const org = await getPlatformOrganizationDetail(id);
  if (!org) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/plataforma/barbearias"
            className="text-sm text-zinc-500 hover:text-brand-200"
          >
            ← Barbearias
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {org.name}
          </h1>
          <p className="mt-1 font-mono text-sm text-zinc-500">/{org.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${org.slug}`}
            target="_blank"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:border-brand-500/40"
          >
            Abrir site
          </Link>
          <Link
            href={`/${org.slug}/agendar`}
            target="_blank"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:border-brand-500/40"
          >
            Agendar
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Status" value={planStatusLabel(org.planStatus)} />
        <MiniStat label="Tier" value={planTierLabel(org.planTier)} />
        <MiniStat
          label="Agendamentos"
          value={String(org.appointmentCount)}
        />
        <MiniStat
          label="Avaliações"
          value={
            org.ratingCount
              ? `${org.ratingAvg?.toFixed(1) ?? "—"} (${org.ratingCount})`
              : "0"
          }
        />
      </div>

      <PlatformOrgEditor
        organizationId={org.id}
        initial={{
          planStatus: org.planStatus,
          planTier: org.planTier,
          trialEndsAt: org.trialEndsAt,
          marketplaceListed: org.marketplaceListed,
        }}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-100">Donos e admins</h2>
        <ul className="divide-y divide-white/5 rounded-2xl border border-white/10">
          {org.staffMembers.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <span>
                <span className="font-medium text-zinc-100">
                  {m.displayName || m.email}
                </span>
                <span className="ml-2 text-zinc-500">{m.email}</span>
              </span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
                {m.role}
              </span>
            </li>
          ))}
          {org.staffMembers.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">
              Nenhum OWNER/ADMIN.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-100">Unidades</h2>
        <ul className="divide-y divide-white/5 rounded-2xl border border-white/10">
          {org.units.map((u) => (
            <li key={u.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-zinc-100">
                  {u.name}
                  {u.isDefault ? (
                    <span className="ml-2 text-xs text-brand-300">padrão</span>
                  ) : null}
                  {!u.isActive ? (
                    <span className="ml-2 text-xs text-rose-300">inativa</span>
                  ) : null}
                </span>
                <span className="text-xs text-zinc-500">
                  {u.serviceCount} serviços · {u.appointmentCount}{" "}
                  agendamentos
                </span>
              </div>
              {(u.city || u.addressLine) && (
                <p className="mt-1 text-xs text-zinc-500">
                  {[u.addressLine, u.city].filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-zinc-400">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-300">
          Billing Asaas (somente leitura)
        </h2>
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">Customer ID</dt>
            <dd className="font-mono text-xs text-zinc-300">
              {org.asaasCustomerId || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Subscription ID</dt>
            <dd className="font-mono text-xs text-zinc-300">
              {org.asaasSubscriptionId || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Asaas do salão</dt>
            <dd>{org.asaasEnabled ? "conectado" : "não"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">E-mail conta salão</dt>
            <dd>{org.asaasAccountEmail || "—"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

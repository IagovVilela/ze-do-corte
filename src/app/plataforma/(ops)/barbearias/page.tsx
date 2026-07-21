import Link from "next/link";

import {
  planStatusLabel,
  planTierLabel,
} from "@/lib/org-entitlements";
import { listPlatformOrganizations } from "@/lib/platform-ops";
import type {
  OrganizationPlanStatus,
  OrganizationPlanTier,
} from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key];
  return typeof v === "string" ? v : Array.isArray(v) ? v[0] : "";
}

export default async function PlataformaBarbeariasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = one(sp, "q");
  const planStatusRaw = one(sp, "planStatus").toUpperCase();
  const planTierRaw = one(sp, "planTier").toUpperCase();

  const planStatus = (
    ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED"] as const
  ).includes(planStatusRaw as OrganizationPlanStatus)
    ? (planStatusRaw as OrganizationPlanStatus)
    : undefined;
  const planTier = (["TRIAL_FULL", "STARTER", "FREE", "PRO"] as const).includes(
    planTierRaw as OrganizationPlanTier,
  )
    ? (planTierRaw as OrganizationPlanTier)
    : undefined;

  const organizations = await listPlatformOrganizations({
    q,
    planStatus,
    planTier,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Barbearias
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {organizations.length} organização(ões) — seus clientes B2B.
        </p>
      </div>

      <form className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs text-zinc-500">
          Busca
          <input
            name="q"
            defaultValue={q}
            placeholder="Nome ou slug"
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/50"
          />
        </label>
        <label className="text-xs text-zinc-500 sm:w-40">
          Status
          <select
            name="planStatus"
            defaultValue={planStatus ?? ""}
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Todos</option>
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Ativo</option>
            <option value="PAST_DUE">Pagamento pendente</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </label>
        <label className="text-xs text-zinc-500 sm:w-40">
          Tier
          <select
            name="planTier"
            defaultValue={planTier ?? ""}
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Todos</option>
            <option value="TRIAL_FULL">Trial full</option>
            <option value="STARTER">Starter (legado)</option>
            <option value="FREE">Free</option>
            <option value="PRO">Pro</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-brand-400"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Barbearia</th>
              <th className="px-4 py-3">Dono</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Marketplace</th>
              <th className="px-4 py-3">Unidades</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {organizations.map((org) => (
              <tr key={org.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-100">{org.name}</p>
                  <p className="font-mono text-xs text-zinc-500">/{org.slug}</p>
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {org.owners[0]?.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {planStatusLabel(org.planStatus)}
                  <br />
                  <span className="text-xs text-zinc-500">
                    {planTierLabel(org.planTier)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {org.marketplaceListed ? (
                    <span className="text-emerald-300">Sim</span>
                  ) : (
                    <span className="text-zinc-500">Não</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-400">
                  {org.unitCount}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/plataforma/barbearias/${org.id}`}
                    className="text-brand-300 hover:text-brand-200"
                  >
                    Gerir
                  </Link>
                </td>
              </tr>
            ))}
            {organizations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  Nenhuma barbearia encontrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";

import { DashboardVolumeArea } from "@/components/dashboard-volume-area";
import { PlatformMixPie } from "@/components/plataforma/platform-mix-pie";
import { PlatformOpsPeriodTabs } from "@/components/plataforma/platform-ops-period-tabs";
import {
  planStatusLabel,
  planTierLabel,
} from "@/lib/org-entitlements";
import {
  getPlatformOverview,
  parsePlatformChartRange,
} from "@/lib/platform-ops";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ range?: string }>;
};

export default async function PlataformaHomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const chartRange = parsePlatformChartRange(sp.range);
  const overview = await getPlatformOverview(chartRange);
  const o = overview.organizations;
  const r = overview.rates;
  const charts = overview.charts;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          Plataforma
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Visão geral
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Indicadores, gráficos e saúde cross-tenant da Barbernegon.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Barbearias" value={o.total} />
        <StatCard label="Em trial" value={o.trial} />
        <StatCard label="Ativas" value={o.active} />
        <StatCard label="No marketplace" value={o.marketplaceListed} />
        <StatCard
          label="% no marketplace"
          value={formatPct(r.marketplacePct)}
          hint="listadas / total"
        />
        <StatCard
          label="% ativas"
          value={formatPct(r.activePct)}
          hint="plano Active"
        />
        <StatCard
          label="% em trial"
          value={formatPct(r.trialPct)}
          hint="ainda em teste"
        />
        <StatCard
          label="% canceladas"
          value={formatPct(r.cancelledPct)}
          hint="plano Cancelled"
        />
        <StatCard label="Trial vence em 7d" value={o.trialsEnding7d} />
        <StatCard label="Trial vence em 14d" value={o.trialsEnding14d} />
        <StatCard label="Pagamento pendente" value={o.pastDue} />
        <StatCard label="Canceladas" value={o.cancelled} />
        <StatCard
          label="Agendamentos hoje"
          value={overview.appointments.today}
        />
        <StatCard
          label="Agendamentos (7 dias)"
          value={overview.appointments.last7Days}
        />
        <StatCard
          label="Agendamentos (30 dias)"
          value={overview.appointments.last30Days}
        />
        <StatCard
          label="Avaliações"
          value={overview.reviews.total}
          hint={
            overview.reviews.avgRating != null
              ? `média ${overview.reviews.avgRating}`
              : undefined
          }
        />
      </div>

      <PlatformOpsPeriodTabs current={chartRange} />

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardVolumeArea
          data={charts.organizationsSeries}
          title="Cadastros de barbearias"
          subtitle={charts.periodLabel}
          unitSingular="cadastro"
          unitPlural="cadastros"
          stroke="#60a5fa"
          gradientId="opsOrgsArea"
        />
        <DashboardVolumeArea
          data={charts.appointmentsSeries}
          title="Agendamentos"
          subtitle={`${charts.periodLabel} · confirmados/concluídos`}
          unitSingular="agendamento"
          unitPlural="agendamentos"
          stroke="#34d399"
          gradientId="opsApptsArea"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PlatformMixPie
          data={charts.planStatusMix}
          title="Mix de planos"
          subtitle="Distribuição atual por status"
          centerLabel="barbearias"
          emptyLabel="Nenhuma barbearia cadastrada."
        />
        <PlatformMixPie
          data={charts.planTierMix}
          title="Mix de tiers"
          subtitle="Trial / Starter / Pro"
          centerLabel="barbearias"
          emptyLabel="Nenhuma barbearia cadastrada."
        />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/plataforma/barbearias"
          className="rounded-full border border-white/15 px-3 py-1.5 text-zinc-300 hover:border-brand-500/40 hover:text-brand-200"
        >
          Barbearias
        </Link>
        <Link
          href="/plataforma/marketplace"
          className="rounded-full border border-white/15 px-3 py-1.5 text-zinc-300 hover:border-brand-500/40 hover:text-brand-200"
        >
          Marketplace
        </Link>
        <Link
          href="/plataforma/consumidores"
          className="rounded-full border border-white/15 px-3 py-1.5 text-zinc-300 hover:border-brand-500/40 hover:text-brand-200"
        >
          Consumidores
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-zinc-100">
            Cadastros recentes
          </h2>
          <Link
            href="/plataforma/barbearias"
            className="text-sm text-brand-300 hover:text-brand-200"
          >
            Ver todas
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Criada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {overview.recentOrganizations.map((org) => (
                <tr key={org.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/plataforma/barbearias/${org.id}`}
                      className="font-medium text-zinc-100 hover:text-brand-200"
                    >
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    /{org.slug}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {planStatusLabel(org.planStatus)} ·{" "}
                    {planTierLabel(org.planTier)}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(org.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {overview.recentOrganizations.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Nenhuma organização ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

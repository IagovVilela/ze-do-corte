import Link from "next/link";

import { listPlatformConsumers } from "@/lib/platform-ops";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key];
  return typeof v === "string" ? v : Array.isArray(v) ? v[0] : "";
}

const statusLabel: Record<string, string> = {
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export default async function PlataformaConsumidoresPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = one(sp, "q");
  const organizationId = one(sp, "organizationId");
  const days = Number(one(sp, "days") || "30") || 30;
  const page = Math.max(Number(one(sp, "page") || "1") || 1, 1);
  const take = 50;
  const skip = (page - 1) * take;

  const [orgs, data] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { name: "asc" },
      take: 300,
      select: { id: true, name: true },
    }),
    listPlatformConsumers({
      q: q || undefined,
      organizationId: organizationId || undefined,
      days,
      skip,
      take,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(data.total / take));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          Consumidores
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Agendamentos na base
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Visão cross-tenant dos clientes finais (via reservas). {data.total}{" "}
          no filtro atual.
        </p>
      </div>

      <form className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="min-w-[12rem] flex-1 text-xs text-zinc-400">
          Busca
          <input
            name="q"
            defaultValue={q}
            placeholder="Nome ou telefone"
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="min-w-[12rem] text-xs text-zinc-400">
          Barbearia
          <select
            name="organizationId"
            defaultValue={organizationId}
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Todas</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Período
          <select
            name="days"
            defaultValue={String(days)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-brand-400"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Barbearia</th>
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Quando</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.appointments.map((a) => (
              <tr key={a.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium text-zinc-100">
                  {a.clientName}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                  {a.clientPhone}
                </td>
                <td className="px-4 py-3">
                  {a.organization ? (
                    <Link
                      href={`/plataforma/barbearias/${a.organization.id}`}
                      className="text-brand-200 hover:underline"
                    >
                      {a.organization.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400">{a.serviceName}</td>
                <td className="px-4 py-3 text-zinc-300">
                  {statusLabel[a.status] ?? a.status}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(a.startsAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
              </tr>
            ))}
            {data.appointments.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  Nenhum agendamento neste filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={`/plataforma/consumidores?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(organizationId ? { organizationId } : {}),
                  days: String(days),
                  page: String(page - 1),
                }).toString()}`}
                className="rounded-full border border-white/15 px-3 py-1 hover:bg-white/5"
              >
                Anterior
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/plataforma/consumidores?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(organizationId ? { organizationId } : {}),
                  days: String(days),
                  page: String(page + 1),
                }).toString()}`}
                className="rounded-full border border-white/15 px-3 py-1 hover:bg-white/5"
              >
                Próxima
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

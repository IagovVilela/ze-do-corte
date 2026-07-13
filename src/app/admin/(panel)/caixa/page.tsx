import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { redirect } from "next/navigation";

import { SectionTitle } from "@/components/section-title";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { appointmentScopeWhere } from "@/lib/staff-access";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminCaixaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const access = await getStaffAccessOrNull();
  if (!access) return null;
  if (!access.permissions.viewRevenue) redirect("/admin");

  const sp = await searchParams;
  const range = typeof sp.range === "string" ? sp.range : "day";
  const days = range === "week" ? 7 : range === "month" ? 30 : 1;
  const to = endOfDay(new Date());
  const from = startOfDay(subDays(to, days - 1));

  const paid = await prisma.appointment.findMany({
    where: {
      ...appointmentScopeWhere(access),
      paidAt: { gte: from, lte: to },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    include: {
      service: { select: { name: true, price: true } },
      staffMember: { select: { displayName: true, email: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  const byMethod = new Map<string, { count: number; total: number }>();
  const byStaff = new Map<string, { count: number; total: number }>();
  let grandTotal = 0;

  for (const row of paid) {
    const amount =
      row.amountPaid != null
        ? Number(row.amountPaid)
        : Number(row.service.price);
    grandTotal += amount;
    const method = row.paymentMethod?.trim() || "Não informado";
    const m = byMethod.get(method) ?? { count: 0, total: 0 };
    m.count += 1;
    m.total += amount;
    byMethod.set(method, m);

    const staffLabel =
      row.staffMember?.displayName?.trim() ||
      row.staffMember?.email ||
      "Sem profissional";
    const s = byStaff.get(staffLabel) ?? { count: 0, total: 0 };
    s.count += 1;
    s.total += amount;
    byStaff.set(staffLabel, s);
  }

  const periodLabel =
    days === 1
      ? format(from, "dd 'de' MMMM", { locale: ptBR })
      : `${format(from, "dd/MM", { locale: ptBR })} — ${format(to, "dd/MM", { locale: ptBR })}`;

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Caixa"
        title="Relatório de recebimentos"
        description={`Pagamentos marcados no balcão · ${periodLabel}`}
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["day", "Hoje"],
            ["week", "7 dias"],
            ["month", "30 dias"],
          ] as const
        ).map(([key, label]) => (
          <a
            key={key}
            href={`/admin/caixa?range=${key}`}
            className={
              range === key || (key === "day" && range !== "week" && range !== "month")
                ? "rounded-full bg-brand-500/20 px-4 py-1.5 text-sm font-medium text-brand-100 ring-1 ring-brand-500/40"
                : "rounded-full border border-white/10 px-4 py-1.5 text-sm text-zinc-400 hover:bg-white/5"
            }
          >
            {label}
          </a>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Total recebido</p>
          <p className="mt-2 font-display text-3xl text-white">{formatMoney(grandTotal)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Pagamentos</p>
          <p className="mt-2 font-display text-3xl text-white">{paid.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Ticket médio</p>
          <p className="mt-2 font-display text-3xl text-white">
            {formatMoney(paid.length ? grandTotal / paid.length : 0)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Por método</h3>
          <ul className="space-y-2">
            {[...byMethod.entries()].map(([method, data]) => (
              <li
                key={method}
                className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm"
              >
                <span className="text-zinc-300">{method}</span>
                <span className="text-zinc-100">
                  {data.count} · {formatMoney(data.total)}
                </span>
              </li>
            ))}
            {byMethod.size === 0 ? (
              <li className="text-sm text-zinc-500">Nenhum pagamento no período.</li>
            ) : null}
          </ul>
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Por profissional</h3>
          <ul className="space-y-2">
            {[...byStaff.entries()].map(([label, data]) => (
              <li
                key={label}
                className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm"
              >
                <span className="text-zinc-300">{label}</span>
                <span className="text-zinc-100">
                  {data.count} · {formatMoney(data.total)}
                </span>
              </li>
            ))}
            {byStaff.size === 0 ? (
              <li className="text-sm text-zinc-500">Nenhum pagamento no período.</li>
            ) : null}
          </ul>
        </section>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-zinc-200">Lançamentos</h3>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Serviço</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {paid.map((row) => {
                const amount =
                  row.amountPaid != null
                    ? Number(row.amountPaid)
                    : Number(row.service.price);
                return (
                  <tr key={row.id} className="border-b border-white/5 text-zinc-300">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.paidAt
                        ? format(row.paidAt, "dd/MM HH:mm", { locale: ptBR })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{row.clientName}</td>
                    <td className="px-4 py-3">{row.service.name}</td>
                    <td className="px-4 py-3">{row.paymentMethod ?? "—"}</td>
                    <td className="px-4 py-3">{formatMoney(amount)}</td>
                  </tr>
                );
              })}
              {paid.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    Sem recebimentos neste período.
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

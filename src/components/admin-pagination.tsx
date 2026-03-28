import Link from "next/link";

import type { DashboardRange } from "@/lib/admin-dashboard";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  /** Preserva o período dos gráficos ao mudar de página (`month` = URL sem query). */
  chartRange?: DashboardRange;
};

function adminListHref(targetPage: number, chartRange: DashboardRange | undefined) {
  const p = new URLSearchParams();
  if (targetPage > 1) p.set("page", String(targetPage));
  if (chartRange && chartRange !== "month") p.set("chartRange", chartRange);
  const q = p.toString();
  return q ? `/admin?${q}` : "/admin";
}

export function AdminPagination({ page, pageSize, total, chartRange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Página {page} de {totalPages} · {total} agendamento
        {total === 1 ? "" : "s"}
      </span>
      <div className="flex gap-2">
        {prev !== null ? (
          <Link
            href={adminListHref(prev, chartRange)}
            className="rounded-full border border-white/15 px-4 py-2 font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Anterior
          </Link>
        ) : (
          <span className="rounded-full border border-transparent px-4 py-2 opacity-40">
            Anterior
          </span>
        )}
        {next !== null ? (
          <Link
            href={adminListHref(next, chartRange)}
            className="rounded-full border border-white/15 px-4 py-2 font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Próxima
          </Link>
        ) : (
          <span className="rounded-full border border-transparent px-4 py-2 opacity-40">
            Próxima
          </span>
        )}
      </div>
    </div>
  );
}

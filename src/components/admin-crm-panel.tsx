"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LoaderCircle, MessageCircle } from "lucide-react";

import { ClearableSearchInput } from "@/components/ui/clearable-search-input";
import type { AdminCrmRisk, AdminCrmSnapshot } from "@/lib/admin-crm-types";
import { cn, formatMoney } from "@/lib/utils";

type Props = {
  initial: AdminCrmSnapshot;
};

const CLUB_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  PAST_DUE: "Em atraso",
  PAUSED: "Pausado",
  CANCELLED: "Cancelado",
};

const RISK_LABEL: Record<AdminCrmRisk, string> = {
  ok: "Em dia",
  at_risk: "Em risco",
  lost: "Sumindo",
};

function clubBadgeClass(status: string | null): string {
  switch (status) {
    case "ACTIVE":
      return "bg-[var(--bn-status-ok)]/15 text-[var(--bn-status-ok)]";
    case "PAST_DUE":
      return "bg-amber-500/15 text-amber-300";
    case "PAUSED":
      return "bg-[var(--bn-surface-container)] text-[var(--bn-muted)]";
    case "CANCELLED":
      return "bg-[var(--bn-surface-container)] text-[var(--bn-muted)]";
    default:
      return "bg-[var(--bn-surface-container)] text-[var(--bn-muted)]";
  }
}

function riskBadgeClass(risk: AdminCrmRisk): string {
  switch (risk) {
    case "ok":
      return "bg-[var(--bn-status-ok)]/15 text-[var(--bn-status-ok)]";
    case "at_risk":
      return "bg-amber-500/15 text-amber-300";
    case "lost":
      return "bg-[var(--bn-status-danger)]/15 text-[var(--bn-status-danger)]";
    default: {
      const _exhaustive: never = risk;
      return _exhaustive;
    }
  }
}

function lastVisitLabel(iso: string | null, booked: string | null): string {
  const ref = iso ?? booked;
  if (!ref) return "—";
  const d = new Date(ref);
  const absolute = format(d, "dd/MM/yyyy", { locale: ptBR });
  const relative = formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
  return `${absolute} · ${relative}`;
}

export function AdminCrmPanel({ initial }: Props) {
  const [data, setData] = useState(initial);
  const [q, setQ] = useState(initial.q);
  const [clubFilter, setClubFilter] = useState(initial.clubFilter);
  const [riskFilter, setRiskFilter] = useState(initial.riskFilter);
  const [sort, setSort] = useState(initial.sort);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts: {
      q: string;
      club: typeof clubFilter;
      risk: typeof riskFilter;
      sort: typeof sort;
      page: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (opts.q.trim()) qs.set("q", opts.q.trim());
        if (opts.club !== "all") qs.set("club", opts.club);
        if (opts.risk !== "all") qs.set("risk", opts.risk);
        if (opts.sort !== "lastVisit") qs.set("sort", opts.sort);
        if (opts.page > 1) qs.set("page", String(opts.page));
        const res = await fetch(`/api/admin/clients?${qs.toString()}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const json = (await res.json()) as
          | AdminCrmSnapshot
          | { message?: string };
        if (!res.ok) {
          setError(
            "message" in json && json.message
              ? json.message
              : "Não foi possível carregar os clientes.",
          );
          return;
        }
        const snap = json as AdminCrmSnapshot;
        setData(snap);
        setPage(snap.page);
      } catch {
        setError("Falha de rede ao carregar clientes.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setData(initial);
    setQ(initial.q);
    setClubFilter(initial.clubFilter);
    setRiskFilter(initial.riskFilter);
    setSort(initial.sort);
    setPage(initial.page);
  }, [initial]);

  const qBoot = useRef(true);
  useEffect(() => {
    if (qBoot.current) {
      qBoot.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      setPage(1);
      void load({ q, club: clubFilter, risk: riskFilter, sort, page: 1 });
    }, 320);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const totalPages = Math.max(1, Math.ceil(data.totalFiltered / data.pageSize));
  const atRiskCount = data.atRiskCount ?? 0;
  const lostCount = data.lostCount ?? 0;
  const actionQueue = data.actionQueue ?? [];

  return (
    <div className="mt-8 space-y-6">
      {/* KPI: sempre 4 slots (Clientes, Clube, Risco, Gasto) — sem grid-cols-3 condicional. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-4">
          <p className="text-xs text-[var(--bn-muted)]">Clientes</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--bn-on)]">
            {data.totalClients}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-4">
          <p className="text-xs text-[var(--bn-muted)]">Clube ativo</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--bn-on)]">
            {data.clubActive}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-4">
          <p className="text-xs text-[var(--bn-muted)]">Em risco / sumindo</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--bn-on)]">
            {atRiskCount + lostCount}
          </p>
          <p className="mt-1 text-[11px] text-[var(--bn-muted)]">
            {atRiskCount} risco · {lostCount} sumindo
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-4",
            !data.canViewRevenue && "invisible",
          )}
          aria-hidden={!data.canViewRevenue}
        >
          <p className="text-xs text-[var(--bn-muted)]">Gasto registrado</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--bn-on)]">
            {formatMoney(data.totalSpent ?? 0)}
          </p>
        </div>
      </div>

      {actionQueue.length > 0 ? (
        <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[var(--bn-on)]">
                WhatsApp hoje
              </h2>
              <p className="mt-0.5 text-xs text-[var(--bn-muted)]">
                Clientes em risco ou sumindo — mensagem pronta para reativar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRiskFilter("actionable");
                setSort("risk");
                setPage(1);
                void load({
                  q,
                  club: clubFilter,
                  risk: "actionable",
                  sort: "risk",
                  page: 1,
                });
              }}
              className="text-xs font-medium text-amber-300 hover:underline"
            >
              Ver todos
            </button>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {actionQueue.map((c) => (
              <li
                key={`q-${c.phoneKey}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface)] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--bn-on)]">
                    {c.name}
                  </p>
                  <p className="text-[11px] text-[var(--bn-muted)]">
                    {RISK_LABEL[c.risk]}
                    {c.daysSinceLastActivity != null
                      ? ` · ${c.daysSinceLastActivity}d`
                      : ""}
                  </p>
                </div>
                {c.whatsappWinBackHref ? (
                  <a
                    href={c.whatsappWinBackHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--bn-primary)] px-3 text-xs font-semibold text-zinc-950"
                  >
                    <MessageCircle className="size-3.5" aria-hidden />
                    WhatsApp
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="min-w-0 flex-1 sm:max-w-xs">
          <ClearableSearchInput
            value={q}
            onChange={setQ}
            withSearchIcon
            placeholder="Buscar nome, telefone…"
            className="w-full rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface)] py-2.5 pr-3 text-base text-[var(--bn-on)] outline-none placeholder:text-[var(--bn-muted)] focus:border-[var(--bn-primary)]/50 focus:ring-2 focus:ring-[var(--bn-primary)]/20 sm:py-2 sm:text-sm"
            aria-label="Buscar clientes"
          />
        </label>

        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", "Todos"],
              ["club", "No clube"],
              ["none", "Sem clube"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setClubFilter(id);
                setPage(1);
                void load({
                  q,
                  club: id,
                  risk: riskFilter,
                  sort,
                  page: 1,
                });
              }}
              className={cn(
                "min-h-9 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                clubFilter === id
                  ? "bg-[var(--bn-primary)] text-zinc-950"
                  : "bg-[var(--bn-surface)] text-[var(--bn-on-variant)] hover:text-[var(--bn-on)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", "Risco: todos"],
              ["at_risk", "Em risco"],
              ["lost", "Sumindo"],
              ["actionable", "Ação"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setRiskFilter(id);
                const nextSort = id === "all" ? sort : "risk";
                setSort(nextSort);
                setPage(1);
                void load({
                  q,
                  club: clubFilter,
                  risk: id,
                  sort: nextSort,
                  page: 1,
                });
              }}
              className={cn(
                "min-h-9 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                riskFilter === id
                  ? "bg-amber-500 text-zinc-950"
                  : "bg-[var(--bn-surface)] text-[var(--bn-on-variant)] hover:text-[var(--bn-on)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-[var(--bn-muted)]">
          Ordenar
          <select
            value={sort}
            onChange={(e) => {
              const next = e.target.value as typeof sort;
              setSort(next);
              setPage(1);
              void load({
                q,
                club: clubFilter,
                risk: riskFilter,
                sort: next,
                page: 1,
              });
            }}
            className="rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface)] px-2 py-2 text-sm text-[var(--bn-on)]"
          >
            <option value="lastVisit">Última visita</option>
            <option value="risk">Maior risco</option>
            <option value="visits">Mais visitas</option>
            {data.canViewRevenue ? (
              <option value="spent">Maior gasto</option>
            ) : null}
            <option value="name">Nome</option>
          </select>
        </label>

        {loading ? (
          <LoaderCircle
            className="size-4 animate-spin text-[var(--bn-muted)]"
            aria-label="Carregando"
          />
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-[var(--bn-status-danger)]/30 bg-[var(--bn-status-danger)]/10 px-3 py-2 text-sm text-[var(--bn-status-danger)]">
          {error}
        </p>
      ) : null}

      {data.clients.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--bn-border)] px-4 py-10 text-center text-sm text-[var(--bn-muted)]">
          Nenhum cliente encontrado
          {q.trim() ? ` para “${q.trim()}”` : ""}. Eles aparecem aqui após o
          primeiro agendamento (ou assinatura do clube).
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {data.clients.map((c) => (
              <li
                key={c.phoneKey}
                className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--bn-on)]">
                      {c.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {c.whatsappWinBackHref && c.risk !== "ok" ? (
                        <a
                          href={c.whatsappWinBackHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--bn-primary)]"
                        >
                          <MessageCircle className="size-3.5" aria-hidden />
                          {c.phone}
                        </a>
                      ) : c.whatsappHref ? (
                        <a
                          href={c.whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--bn-primary)]"
                        >
                          <MessageCircle className="size-3.5" aria-hidden />
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--bn-muted)]">
                          {c.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        riskBadgeClass(c.risk),
                      )}
                    >
                      {RISK_LABEL[c.risk]}
                    </span>
                    {c.clubStatus && c.clubStatus !== "CANCELLED" ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          clubBadgeClass(c.clubStatus),
                        )}
                      >
                        {CLUB_LABEL[c.clubStatus] ?? c.clubStatus}
                      </span>
                    ) : null}
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-[var(--bn-muted)]">Última visita</dt>
                    <dd className="mt-0.5 text-[var(--bn-on-variant)]">
                      {lastVisitLabel(c.lastVisitAt, c.lastBookedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--bn-muted)]">Visitas</dt>
                    <dd className="mt-0.5 text-[var(--bn-on-variant)]">
                      {c.visitCount}
                    </dd>
                  </div>
                  {data.canViewRevenue ? (
                    <div>
                      <dt className="text-[var(--bn-muted)]">Gasto</dt>
                      <dd className="mt-0.5 font-medium text-[var(--bn-on)]">
                        {formatMoney(c.totalSpent ?? 0)}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-[var(--bn-muted)]">Clube</dt>
                    <dd className="mt-0.5 text-[var(--bn-on-variant)]">
                      {c.clubPlanName ?? "—"}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-xl border border-[var(--bn-border)] md:block">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] text-[11px] font-bold tracking-wide text-[var(--bn-muted)] uppercase">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Risco</th>
                  <th className="px-4 py-3">Última visita</th>
                  <th className="px-4 py-3">Visitas</th>
                  {data.canViewRevenue ? (
                    <th className="px-4 py-3">Gasto</th>
                  ) : null}
                  <th className="px-4 py-3">Clube</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bn-border)]">
                {data.clients.map((c) => (
                  <tr key={c.phoneKey} className="bg-[var(--bn-surface)]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--bn-on)]">
                        {c.name}
                      </div>
                      {c.email ? (
                        <div className="text-xs text-[var(--bn-muted)]">
                          {c.email}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {(c.risk !== "ok"
                        ? c.whatsappWinBackHref
                        : c.whatsappHref) ? (
                        <a
                          href={
                            (c.risk !== "ok"
                              ? c.whatsappWinBackHref
                              : c.whatsappHref)!
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[var(--bn-primary)] hover:underline"
                          title="Abrir WhatsApp"
                        >
                          <MessageCircle
                            className="size-3.5 shrink-0"
                            aria-hidden
                          />
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-[var(--bn-on-variant)]">
                          {c.phone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          riskBadgeClass(c.risk),
                        )}
                      >
                        {RISK_LABEL[c.risk]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--bn-muted)]">
                      {lastVisitLabel(c.lastVisitAt, c.lastBookedAt)}
                    </td>
                    <td className="px-4 py-3 text-[var(--bn-on-variant)]">
                      {c.visitCount}
                    </td>
                    {data.canViewRevenue ? (
                      <td className="px-4 py-3 font-medium text-[var(--bn-on)]">
                        {formatMoney(c.totalSpent ?? 0)}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      {c.clubStatus && c.clubStatus !== "CANCELLED" ? (
                        <div>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              clubBadgeClass(c.clubStatus),
                            )}
                          >
                            {CLUB_LABEL[c.clubStatus] ?? c.clubStatus}
                          </span>
                          {c.clubPlanName ? (
                            <div className="mt-1 text-xs text-[var(--bn-muted)]">
                              {c.clubPlanName}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[var(--bn-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--bn-muted)]">
                Página {page} de {totalPages} · {data.totalFiltered} no filtro
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    const next = page - 1;
                    setPage(next);
                    void load({
                      q,
                      club: clubFilter,
                      risk: riskFilter,
                      sort,
                      page: next,
                    });
                  }}
                  className="rounded-lg border border-[var(--bn-border)] px-3 py-2 text-xs font-medium text-[var(--bn-on-variant)] transition hover:bg-[var(--bn-hover)] disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    void load({
                      q,
                      club: clubFilter,
                      risk: riskFilter,
                      sort,
                      page: next,
                    });
                  }}
                  className="rounded-lg border border-[var(--bn-border)] px-3 py-2 text-xs font-medium text-[var(--bn-on-variant)] transition hover:bg-[var(--bn-hover)] disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

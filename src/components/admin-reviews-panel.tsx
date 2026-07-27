"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LoaderCircle, Star } from "lucide-react";

import type { AdminReviewsSnapshot } from "@/lib/admin-reviews-types";
import { cn } from "@/lib/utils";

type Props = {
  initial: AdminReviewsSnapshot;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} de 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const on = i < rating;
        return (
          <Star
            key={i}
            className={cn(
              "size-3.5",
              on
                ? "fill-amber-400 text-amber-400"
                : "text-[var(--bn-muted)] opacity-40",
            )}
            aria-hidden
          />
        );
      })}
    </span>
  );
}

export function AdminReviewsPanel({ initial }: Props) {
  const [data, setData] = useState(initial);
  const [ratingFilter, setRatingFilter] = useState<number | null>(
    initial.ratingFilter,
  );
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (rating: number | null, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (rating != null) qs.set("rating", String(rating));
      if (pageNum > 1) qs.set("page", String(pageNum));
      const res = await fetch(`/api/admin/reviews?${qs.toString()}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = (await res.json()) as
        | AdminReviewsSnapshot
        | { message?: string };
      if (!res.ok) {
        setError(
          "message" in json && json.message
            ? json.message
            : "Não foi possível carregar as avaliações.",
        );
        return;
      }
      setData(json as AdminReviewsSnapshot);
      setPage((json as AdminReviewsSnapshot).page);
    } catch {
      setError("Falha de rede ao carregar avaliações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setData(initial);
    setRatingFilter(initial.ratingFilter);
    setPage(initial.page);
  }, [initial]);

  const totalPages = Math.max(1, Math.ceil(data.totalFiltered / data.pageSize));

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-4">
          <p className="text-xs text-[var(--bn-muted)]">Média geral</p>
          <p className="mt-2 flex items-baseline gap-2 text-2xl font-semibold text-[var(--bn-on)]">
            {data.ratingAvg != null ? data.ratingAvg.toFixed(1).replace(".", ",") : "—"}
            {data.ratingAvg != null ? (
              <Stars rating={Math.round(data.ratingAvg)} />
            ) : null}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-4">
          <p className="text-xs text-[var(--bn-muted)]">Total de avaliações</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--bn-on)]">
            {data.ratingCount}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[var(--bn-muted)]">Nota</span>
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
          <button
            type="button"
            onClick={() => {
              setRatingFilter(null);
              setPage(1);
              void load(null, 1);
            }}
            className={cn(
              "min-h-9 shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
              ratingFilter == null
                ? "bg-[var(--bn-primary)] text-zinc-950"
                : "bg-[var(--bn-surface)] text-[var(--bn-on-variant)] hover:text-[var(--bn-on)]",
            )}
          >
            Todas
          </button>
          {[5, 4, 3, 2, 1].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setRatingFilter(n);
                setPage(1);
                void load(n, 1);
              }}
              className={cn(
                "min-h-9 shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                ratingFilter === n
                  ? "bg-[var(--bn-primary)] text-zinc-950"
                  : "bg-[var(--bn-surface)] text-[var(--bn-on-variant)] hover:text-[var(--bn-on)]",
              )}
            >
              {n}★
            </button>
          ))}
        </div>
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

      {data.reviews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--bn-border)] px-4 py-10 text-center text-sm text-[var(--bn-muted)]">
          Ainda não há avaliações
          {ratingFilter != null ? ` com ${ratingFilter} estrela${ratingFilter === 1 ? "" : "s"}` : ""}.
          O cliente avalia pelo link da reserva após o atendimento.
        </p>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {data.reviews.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--bn-on)]">
                      {r.clientDisplayName}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--bn-muted)]">
                      {r.clientPhone}
                    </p>
                  </div>
                  <Stars rating={r.rating} />
                </div>
                {r.comment ? (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--bn-on-variant)]">
                    {r.comment}
                  </p>
                ) : (
                  <p className="mt-3 text-sm italic text-[var(--bn-muted)]">
                    Sem comentário
                  </p>
                )}
                <p className="mt-3 text-xs text-[var(--bn-muted)]">
                  Avaliado em{" "}
                  {format(new Date(r.createdAt), "dd MMM yyyy · HH:mm", {
                    locale: ptBR,
                  })}
                  {r.appointment
                    ? ` · ${r.appointment.serviceName} (${format(new Date(r.appointment.startsAt), "dd/MM", { locale: ptBR })})`
                    : null}
                </p>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-[var(--bn-border)] md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] text-[11px] font-bold tracking-wide text-[var(--bn-muted)] uppercase">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Nota</th>
                  <th className="px-4 py-3">Comentário</th>
                  <th className="px-4 py-3">Atendimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bn-border)]">
                {data.reviews.map((r) => (
                  <tr key={r.id} className="bg-[var(--bn-surface)]">
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--bn-muted)]">
                      {format(new Date(r.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--bn-on)]">
                        {r.clientDisplayName}
                      </div>
                      <div className="text-xs text-[var(--bn-muted)]">
                        {r.clientPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Stars rating={r.rating} />
                    </td>
                    <td className="max-w-xs px-4 py-3 text-[var(--bn-on-variant)]">
                      {r.comment?.trim() || (
                        <span className="italic text-[var(--bn-muted)]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--bn-muted)]">
                      {r.appointment ? (
                        <>
                          <div>{r.appointment.serviceName}</div>
                          <div className="text-xs">
                            {format(
                              new Date(r.appointment.startsAt),
                              "dd/MM/yyyy HH:mm",
                              { locale: ptBR },
                            )}
                          </div>
                        </>
                      ) : (
                        "—"
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
                    void load(ratingFilter, next);
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
                    void load(ratingFilter, next);
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

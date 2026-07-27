"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { AppointmentComanda } from "@/lib/admin-appointment-comanda";
import { cn } from "@/lib/utils";

type CatalogService = { id: string; name: string; price: number };
type CatalogProduct = { id: string; name: string; price: number; stockQty: number | null };

type Props = {
  appointmentId: string | null;
  timezone: string;
  canEdit: boolean;
  services: CatalogService[];
  products: CatalogProduct[];
  onClose: () => void;
  onChanged?: () => void;
};

const STATUS_LABEL: Record<AppointmentComanda["status"], string> = {
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function AdminAppointmentComandaSheet({
  appointmentId,
  timezone,
  canEdit,
  services,
  products,
  onClose,
  onChanged,
}: Props) {
  const [comanda, setComanda] = useState<AppointmentComanda | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [servicePick, setServicePick] = useState("");
  const [productPick, setProductPick] = useState("");

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/appointments/${id}/comanda`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        comanda?: AppointmentComanda;
        message?: string;
      };
      if (!res.ok || !data.comanda) {
        setError(data.message ?? "Falha ao carregar comanda.");
        setComanda(null);
        return;
      }
      setComanda(data.comanda);
    } catch {
      setError("Erro de rede.");
      setComanda(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!appointmentId) {
      setComanda(null);
      return;
    }
    void load(appointmentId);
  }, [appointmentId, load]);

  useEffect(() => {
    if (!appointmentId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [appointmentId, onClose]);

  async function patch(body: Record<string, unknown>) {
    if (!appointmentId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/appointments/${appointmentId}/comanda`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await res.json()) as {
        comanda?: AppointmentComanda;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível atualizar.");
        return;
      }
      if (data.comanda) setComanda(data.comanda);
      onChanged?.();
    } catch {
      setError("Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  if (!appointmentId) return null;

  return (
    <div className="fixed inset-0 z-[300] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Fechar comanda"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--bn-border)] px-4 py-3">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-[var(--bn-muted)] uppercase">
              Comanda
            </p>
            <h2 className="text-lg font-semibold text-[var(--bn-on)]">
              {comanda?.clientName ?? "Carregando…"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--bn-muted)] hover:bg-[var(--bn-hover)] hover:text-[var(--bn-on)]"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && !comanda ? (
            <p className="text-sm text-[var(--bn-muted)]">Carregando…</p>
          ) : null}
          {error ? (
            <p className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}
          {comanda ? (
            <div className="space-y-5">
              <div className="space-y-1 text-sm text-[var(--bn-on)]">
                <p className="text-[var(--bn-muted)]">{comanda.clientPhone}</p>
                <p>
                  {formatInTimeZone(
                    new Date(comanda.startsAt),
                    timezone,
                    "dd/MM/yyyy HH:mm",
                    { locale: ptBR },
                  )}{" "}
                  –{" "}
                  {formatInTimeZone(new Date(comanda.endsAt), timezone, "HH:mm")}
                </p>
                <p className="text-[var(--bn-muted)]">
                  {STATUS_LABEL[comanda.status]}
                  {comanda.assignedStaffLabel
                    ? ` · ${comanda.assignedStaffLabel}`
                    : ""}
                  {comanda.unitName ? ` · ${comanda.unitName}` : ""}
                </p>
                {comanda.bookingSource ? (
                  <p className="text-xs text-[var(--bn-muted)]">
                    Origem: {comanda.bookingSource}
                  </p>
                ) : null}
              </div>

              <section>
                <h3 className="text-xs font-bold tracking-wide text-[var(--bn-muted)] uppercase">
                  Serviços
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {comanda.services.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-lg bg-[var(--bn-surface)] px-3 py-2 text-sm"
                    >
                      <span className="text-[var(--bn-on)]">
                        {s.name}
                        <span className="ml-2 text-xs text-[var(--bn-muted)]">
                          {s.durationMinutes} min
                        </span>
                      </span>
                      <span className="tabular-nums text-[var(--bn-on)]">
                        {money(s.price)}
                      </span>
                    </li>
                  ))}
                </ul>
                {canEdit ? (
                  <div className="mt-2 flex gap-2">
                    <select
                      className="min-w-0 flex-1 rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-2 py-1.5 text-sm text-[var(--bn-on)]"
                      value={servicePick}
                      onChange={(e) => setServicePick(e.target.value)}
                    >
                      <option value="">Adicionar serviço…</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!servicePick || busy}
                      onClick={() => {
                        void patch({
                          action: "addService",
                          serviceId: servicePick,
                        }).then(() => setServicePick(""));
                      }}
                      className="rounded-lg bg-[var(--bn-primary)] px-3 py-1.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                ) : null}
              </section>

              <section>
                <h3 className="text-xs font-bold tracking-wide text-[var(--bn-muted)] uppercase">
                  Produtos
                </h3>
                {comanda.products.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--bn-muted)]">N/A</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {comanda.products.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[var(--bn-surface)] px-3 py-2 text-sm"
                      >
                        <span className="text-[var(--bn-on)]">
                          {p.name}
                          {p.quantity > 1 ? ` ×${p.quantity}` : ""}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="tabular-nums">
                            {money(p.unitPrice * p.quantity)}
                          </span>
                          {canEdit ? (
                            <button
                              type="button"
                              disabled={busy}
                              className="text-xs text-rose-300 hover:underline"
                              onClick={() =>
                                void patch({
                                  action: "removeProduct",
                                  lineId: p.id,
                                })
                              }
                            >
                              Remover
                            </button>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {canEdit && products.length > 0 ? (
                  <div className="mt-2 flex gap-2">
                    <select
                      className="min-w-0 flex-1 rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-2 py-1.5 text-sm text-[var(--bn-on)]"
                      value={productPick}
                      onChange={(e) => setProductPick(e.target.value)}
                    >
                      <option value="">Adicionar produto…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!productPick || busy}
                      onClick={() => {
                        void patch({
                          action: "addProduct",
                          productId: productPick,
                          quantity: 1,
                        }).then(() => setProductPick(""));
                      }}
                      className="rounded-lg bg-[var(--bn-primary)] px-3 py-1.5 text-sm font-semibold text-zinc-950 transition hover:opacity-90 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                ) : null}
              </section>

              {comanda.repurchase.length > 0 ? (
                <section className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-100">
                  {comanda.repurchase.map((r) => (
                    <div
                      key={`${r.kind}-${r.id}`}
                      className="flex items-start justify-between gap-2 border-b border-sky-500/20 py-2 last:border-0"
                    >
                      <p>
                        Este cliente possui o seguinte item para recompra:{" "}
                        <strong>{r.name}</strong> para a data:{" "}
                        <strong>
                          {format(new Date(r.lastAt), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </strong>
                      </p>
                      {canEdit ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="shrink-0 rounded-full bg-sky-400/20 px-2 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-400/30"
                          onClick={() =>
                            void patch(
                              r.kind === "service"
                                ? { action: "addService", serviceId: r.id }
                                : {
                                    action: "addProduct",
                                    productId: r.id,
                                    quantity: 1,
                                  },
                            )
                          }
                        >
                          Adicionar
                        </button>
                      ) : null}
                    </div>
                  ))}
                </section>
              ) : null}

              {comanda.history.length > 0 ? (
                <section>
                  <h3 className="text-xs font-bold tracking-wide text-[var(--bn-muted)] uppercase">
                    Histórico do cliente
                  </h3>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[20rem] text-left text-xs">
                      <thead className="text-[var(--bn-muted)]">
                        <tr>
                          <th className="py-1 pr-2 font-medium">Data</th>
                          <th className="py-1 pr-2 font-medium">Prof.</th>
                          <th className="py-1 pr-2 font-medium">Serviços</th>
                          <th className="py-1 font-medium">Produtos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comanda.history.map((h) => (
                          <tr
                            key={h.id}
                            className="border-t border-[var(--bn-border)] text-[var(--bn-on)]"
                          >
                            <td className="py-1.5 pr-2 whitespace-nowrap">
                              {formatInTimeZone(
                                new Date(h.startsAt),
                                timezone,
                                "dd/MM/yy HH:mm",
                              )}
                            </td>
                            <td className="py-1.5 pr-2">
                              {h.staffLabel ?? "—"}
                            </td>
                            <td className="py-1.5 pr-2">
                              {h.services.join(", ")}
                            </td>
                            <td className="py-1.5">
                              {h.products.length > 0
                                ? h.products.join(", ")
                                : "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              <div className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-3 text-sm">
                <div className="flex justify-between text-[var(--bn-muted)]">
                  <span>Serviços</span>
                  <span>{money(comanda.servicesTotal)}</span>
                </div>
                <div className="mt-1 flex justify-between text-[var(--bn-muted)]">
                  <span>Produtos</span>
                  <span>{money(comanda.productsTotal)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-[var(--bn-border)] pt-2 font-semibold text-[var(--bn-on)]">
                  <span>Total</span>
                  <span>{money(comanda.grandTotal)}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--bn-muted)]">
                  {comanda.paidAt
                    ? `Pago · ${comanda.paymentMethod ?? "—"}`
                    : "A receber"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {comanda.clientManageToken ? (
                  <a
                    href={`/minha-reserva/${comanda.clientManageToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[var(--bn-border)] px-3 py-1.5 text-xs font-medium text-[var(--bn-primary)]"
                  >
                    Link do cliente
                  </a>
                ) : null}
                {canEdit && !comanda.paidAt && comanda.status !== "CANCELLED" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void patch({ action: "markPaid", paymentMethod: "Balcão" })
                    }
                    className={cn(
                      "rounded-full bg-[var(--bn-primary)] px-3 py-1.5 text-xs font-semibold text-zinc-950 disabled:opacity-50",
                    )}
                  >
                    Marcar pago
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

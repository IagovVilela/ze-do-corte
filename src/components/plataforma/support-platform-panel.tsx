"use client";

import { FormEvent, useEffect, useState } from "react";
import type {
  SupportTicketCategory,
  SupportTicketStatus,
} from "@prisma/client";

import {
  PLATFORM_SUPPORT_DISPLAY_NAME,
  SUPPORT_TICKET_CATEGORY_LABEL,
  SUPPORT_TICKET_STATUS_LABEL,
} from "@/lib/support";
import { readResponseJson } from "@/lib/read-response-json";
import { cn } from "@/lib/utils";

type TicketListItem = {
  id: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  organization: { id: string; name: string; slug: string };
  createdByStaff: { displayName: string | null; email: string };
  _count: { messages: number };
};

type TicketMessage = {
  id: string;
  body: string;
  authorKind: "STAFF" | "PLATFORM";
  authorEmail: string | null;
  createdAt: string;
  authorStaff: { displayName: string | null; email: string } | null;
};

type TicketDetail = {
  id: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  organization: { id: string; name: string; slug: string };
  createdByStaff: { displayName: string | null; email: string };
  messages: TicketMessage[];
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand-500/60";

export function SupportPlatformPanel() {
  const [statusFilter, setStatusFilter] = useState<
    SupportTicketStatus | "ALL"
  >("ALL");
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadList(filter: SupportTicketStatus | "ALL" = statusFilter) {
    const q = filter === "ALL" ? "" : `?status=${filter}`;
    const res = await fetch(`/api/platform/support/tickets${q}`);
    const data = await readResponseJson<{ tickets?: TicketListItem[] }>(res);
    if (!res.ok) throw new Error(data.message ?? "Falha ao listar.");
    setTickets(data.tickets ?? []);
  }

  async function loadDetail(id: string) {
    setSelectedId(id);
    const res = await fetch(`/api/platform/support/tickets/${id}`);
    const data = await readResponseJson<{ ticket?: TicketDetail }>(res);
    if (!res.ok) throw new Error(data.message ?? "Chamado não encontrado.");
    setDetail(data.ticket ?? null);
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        await loadList();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial
  }, []);

  async function onFilter(next: SupportTicketStatus | "ALL") {
    setStatusFilter(next);
    setError("");
    try {
      await loadList(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    }
  }

  async function onStatus(status: SupportTicketStatus) {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/platform/support/tickets/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await readResponseJson(res);
      if (!res.ok) throw new Error(data.message ?? "Falha ao atualizar.");
      await loadDetail(selectedId);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  async function onReply(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/platform/support/tickets/${selectedId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: reply }),
        },
      );
      const data = await readResponseJson(res);
      if (!res.ok) throw new Error(data.message ?? "Falha ao responder.");
      setReply("");
      await loadDetail(selectedId);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Carregando inbox…</p>;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            "ALL",
            "OPEN",
            "IN_PROGRESS",
            "RESOLVED",
            "CLOSED",
          ] as const
        ).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void onFilter(s)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              statusFilter === s
                ? "bg-brand-500/25 text-brand-100 ring-1 ring-brand-500/40"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
            )}
          >
            {s === "ALL" ? "Todos" : SUPPORT_TICKET_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <ul className="space-y-2">
          {tickets.length === 0 ? (
            <li className="text-sm text-zinc-500">Nenhum chamado neste filtro.</li>
          ) : (
            tickets.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => void loadDetail(t.id).catch((e: unknown) => {
                    setError(e instanceof Error ? e.message : "Erro.");
                  })}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left text-sm transition",
                    selectedId === t.id
                      ? "border-brand-500/50 bg-brand-500/10"
                      : "border-white/10 hover:border-white/20",
                  )}
                >
                  <p className="font-semibold text-zinc-100">{t.subject}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {t.organization.name} ·{" "}
                    {SUPPORT_TICKET_CATEGORY_LABEL[t.category]} ·{" "}
                    {SUPPORT_TICKET_STATUS_LABEL[t.status]} ·{" "}
                    {t._count.messages} msg
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {!detail ? (
            <p className="text-sm text-zinc-500">
              Selecione um chamado à esquerda.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {detail.subject}
                </h2>
                <p className="text-xs text-zinc-500">
                  {detail.organization.name} (/{detail.organization.slug}) ·{" "}
                  {detail.createdByStaff.displayName ||
                    detail.createdByStaff.email}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  Object.keys(
                    SUPPORT_TICKET_STATUS_LABEL,
                  ) as SupportTicketStatus[]
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={saving || detail.status === s}
                    onClick={() => void onStatus(s)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                      detail.status === s
                        ? "bg-brand-500/30 text-brand-100"
                        : "border border-white/15 text-zinc-400 hover:text-zinc-200",
                    )}
                  >
                    {SUPPORT_TICKET_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>

              <div className="max-h-96 space-y-3 overflow-y-auto">
                {detail.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm",
                      m.authorKind === "PLATFORM"
                        ? "bg-brand-500/20 text-zinc-100"
                        : "bg-white/5 text-zinc-300",
                    )}
                  >
                    <p className="text-[11px] font-bold tracking-wide text-zinc-500 uppercase">
                      {m.authorKind === "PLATFORM"
                        ? PLATFORM_SUPPORT_DISPLAY_NAME
                        : m.authorStaff?.displayName ||
                          m.authorStaff?.email ||
                          "Salão"}
                      {" · "}
                      {new Date(m.createdAt).toLocaleString("pt-BR")}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>

              {detail.status !== "CLOSED" ? (
                <form onSubmit={onReply} className="space-y-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={4}
                    required
                    placeholder="Resposta para o salão…"
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    Responder
                  </button>
                </form>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

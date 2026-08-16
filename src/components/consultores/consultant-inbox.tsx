"use client";

import { FormEvent, useEffect, useState } from "react";
import type {
  SupportTicketCategory,
  SupportTicketStatus,
} from "@prisma/client";
import Link from "next/link";

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

type OrgCard = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  planStatusLabel: string;
  planTierLabel: string;
  asaasEnabled: boolean;
  whatsappConnected: boolean;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand-500/60";

export function ConsultantInbox() {
  const [statusFilter, setStatusFilter] = useState<
    SupportTicketStatus | "ALL"
  >("OPEN");
  const [q, setQ] = useState("");
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [org, setOrg] = useState<OrgCard | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadList(
    filter: SupportTicketStatus | "ALL" = statusFilter,
    query = q,
  ) {
    const params = new URLSearchParams();
    if (filter !== "ALL") params.set("status", filter);
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/consultores/tickets?${params.toString()}`);
    const data = await readResponseJson<{ tickets?: TicketListItem[] }>(res);
    if (!res.ok) throw new Error(data.message ?? "Falha ao listar.");
    setTickets(data.tickets ?? []);
  }

  async function loadDetail(id: string) {
    setSelectedId(id);
    const res = await fetch(`/api/consultores/tickets/${id}`);
    const data = await readResponseJson<{ ticket?: TicketDetail }>(res);
    if (!res.ok) throw new Error(data.message ?? "Chamado não encontrado.");
    const ticket = data.ticket ?? null;
    setDetail(ticket);
    if (ticket) {
      const orgRes = await fetch(
        `/api/consultores/organizations/${ticket.organization.id}`,
      );
      const orgData = await readResponseJson<{ organization?: OrgCard }>(orgRes);
      setOrg(orgData.organization ?? null);
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAssist() {
    if (!detail) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/consultores/organizations/${detail.organization.id}/assist`,
        { method: "POST" },
      );
      const data = await readResponseJson<{ redirect?: string; message?: string }>(
        res,
      );
      if (!res.ok) throw new Error(data.message ?? "Não foi possível abrir o painel.");
      window.location.href = data.redirect || "/admin";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
      setSaving(false);
    }
  }

  async function onStatus(status: SupportTicketStatus) {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/consultores/tickets/${selectedId}`, {
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
        `/api/consultores/tickets/${selectedId}/messages`,
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

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void loadList(statusFilter, q).catch((err: unknown) => {
            setError(err instanceof Error ? err.message : "Erro.");
          });
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou slug da barbearia"
          className={inputClass}
        />
        <button
          type="submit"
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-zinc-100"
        >
          Buscar
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map(
          (s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatusFilter(s);
                void loadList(s, q);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                statusFilter === s
                  ? "bg-brand-500/25 text-brand-100 ring-1 ring-brand-500/40"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
              )}
            >
              {s === "ALL" ? "Todos" : SUPPORT_TICKET_STATUS_LABEL[s]}
            </button>
          ),
        )}
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
                  onClick={() =>
                    void loadDetail(t.id).catch((e: unknown) => {
                      setError(e instanceof Error ? e.message : "Erro.");
                    })
                  }
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
                    {SUPPORT_TICKET_STATUS_LABEL[t.status]}
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="space-y-4">
          {org && detail ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                Ficha (sem dados sensíveis)
              </p>
              <p className="mt-1 text-lg font-semibold text-white">{org.name}</p>
              <p className="font-mono text-xs text-zinc-500">/{org.slug}</p>
              <ul className="mt-3 space-y-1 text-zinc-300">
                <li>Cidade: {org.city ?? "—"}</li>
                <li>
                  Plano: {org.planTierLabel} ({org.planStatusLabel})
                </li>
                <li>Asaas ligado: {org.asaasEnabled ? "sim" : "não"}</li>
                <li>WhatsApp: {org.whatsappConnected ? "ligado" : "não"}</li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/${org.slug}`}
                  target="_blank"
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-zinc-200"
                >
                  Ver site público
                </Link>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void onAssist()}
                  className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 disabled:opacity-60"
                >
                  Abrir painel (assistência)
                </button>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {!detail ? (
              <p className="text-sm text-zinc-500">Selecione um chamado.</p>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  {detail.subject}
                </h2>
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
                          : "border border-white/15 text-zinc-400",
                      )}
                    >
                      {SUPPORT_TICKET_STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
                <div className="max-h-80 space-y-3 overflow-y-auto">
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
                          : m.authorStaff?.displayName || "Salão"}
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
    </div>
  );
}

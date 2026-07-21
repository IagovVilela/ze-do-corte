"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  SupportTicketCategory,
  SupportTicketStatus,
} from "@prisma/client";

import {
  SUPPORT_ARTICLE_CATEGORY_LABEL,
  SUPPORT_ARTICLES,
  type SupportArticle,
  type SupportArticleCategory,
} from "@/lib/support-articles";
import {
  PLATFORM_SUPPORT_DISPLAY_NAME,
  SUPPORT_TICKET_CATEGORY_LABEL,
  SUPPORT_TICKET_STATUS_LABEL,
} from "@/lib/support";
import { readResponseJson } from "@/lib/read-response-json";
import { cn } from "@/lib/utils";

function articleCategoryToTicket(
  category: SupportArticleCategory,
): SupportTicketCategory {
  switch (category) {
    case "whatsapp":
      return "WHATSAPP";
    case "payments":
      return "PAYMENTS";
    case "club":
      return "CLUB";
    case "site":
    case "agenda":
      return "SITE";
    case "billing":
      return "BILLING";
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}
type Tab = "ajuda" | "chamados" | "contato";

type ContactInfo = {
  whatsappHref: string | null;
  mailtoHref: string | null;
  email: string | null;
  whatsappE164: string | null;
};

type TicketRow = {
  id: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
};

type TicketMessage = {
  id: string;
  body: string;
  authorKind: "STAFF" | "PLATFORM";
  authorEmail: string | null;
  createdAt: string;
  authorStaff: { displayName: string | null; email: string } | null;
};

type TicketDetail = TicketRow & {
  resolvedAt: string | null;
  messages: TicketMessage[];
};

const inputClass =
  "w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-4 py-2.5 text-sm text-[var(--bn-on)] outline-none focus:border-brand-500/60";

const tabClass = (active: boolean) =>
  cn(
    "rounded-lg px-3 py-2 text-sm font-semibold transition",
    active
      ? "bg-[var(--bn-primary-container)] text-white"
      : "text-[var(--bn-muted)] hover:bg-[var(--bn-hover)] hover:text-[var(--bn-on)]",
  );

function tabFromHash(): Tab {
  if (typeof window === "undefined") return "ajuda";
  const h = window.location.hash.replace("#", "");
  if (h === "chamados" || h === "contato" || h === "ajuda") return h;
  return "ajuda";
}

export function SupportAdminPanel({
  initialTab,
  initialCategory,
}: {
  initialTab?: Tab;
  initialCategory?: SupportTicketCategory;
}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? "ajuda");
  const [articleFilter, setArticleFilter] = useState<
    SupportArticleCategory | "all"
  >("all");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>(
    initialCategory ?? "OTHER",
  );
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");

  useEffect(() => {
    if (!initialTab) {
      setTab(tabFromHash());
    }
  }, [initialTab]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const [cRes, tRes] = await Promise.all([
          fetch("/api/admin/support/contact"),
          fetch("/api/admin/support/tickets"),
        ]);
        const cData = await readResponseJson<{ contact?: ContactInfo }>(cRes);
        const tData = await readResponseJson<{ tickets?: TicketRow[] }>(tRes);
        if (!cRes.ok) throw new Error(cData.message ?? "Falha no contato.");
        setContact(cData.contact ?? null);
        if (tRes.ok) {
          setTickets(tData.tickets ?? []);
        } else {
          setError(
            tData.message ??
              "Chamados indisponíveis no momento (banco pode estar sem migração).",
          );
          setTickets([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadDetail(id: string) {
    setSelectedId(id);
    setDetail(null);
    setError("");
    const res = await fetch(`/api/admin/support/tickets/${id}/messages`);
    const data = await readResponseJson<{ ticket?: TicketDetail }>(res);
    if (!res.ok) {
      setError(data.message ?? "Não foi possível abrir o chamado.");
      return;
    }
    setDetail(data.ticket ?? null);
  }

  async function reloadTickets() {
    const tRes = await fetch("/api/admin/support/tickets");
    const tData = await readResponseJson<{ tickets?: TicketRow[] }>(tRes);
    if (tRes.ok) setTickets(tData.tickets ?? []);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, category, body }),
      });
      const data = await readResponseJson<{ ticket?: TicketRow }>(res);
      if (!res.ok) throw new Error(data.message ?? "Não foi possível abrir.");
      setSubject("");
      setBody("");
      setMessage(data.message ?? "Chamado aberto.");
      setTab("chamados");
      await reloadTickets();
      if (data.ticket?.id) await loadDetail(data.ticket.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
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
        `/api/admin/support/tickets/${selectedId}/messages`,
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
      await reloadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  const filteredArticles = useMemo(() => {
    if (articleFilter === "all") return SUPPORT_ARTICLES;
    return SUPPORT_ARTICLES.filter((a) => a.category === articleFilter);
  }, [articleFilter]);

  const openArticle: SupportArticle | undefined = openSlug
    ? SUPPORT_ARTICLES.find((a) => a.slug === openSlug)
    : undefined;

  function goTab(next: Tab) {
    setTab(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${next}`);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-[var(--bn-muted)]">Carregando suporte…</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={tabClass(tab === "ajuda")} onClick={() => goTab("ajuda")}>
          Ajuda
        </button>
        <button
          type="button"
          className={tabClass(tab === "chamados")}
          onClick={() => goTab("chamados")}
        >
          Meus chamados
        </button>
        <button
          type="button"
          className={tabClass(tab === "contato")}
          onClick={() => goTab("contato")}
        >
          Falar conosco
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--bn-status-ok)]">
          {message}
        </p>
      ) : null}

      {tab === "ajuda" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setArticleFilter("all")}
              className={tabClass(articleFilter === "all")}
            >
              Todos
            </button>
            {(
              Object.keys(SUPPORT_ARTICLE_CATEGORY_LABEL) as SupportArticleCategory[]
            ).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setArticleFilter(key)}
                className={tabClass(articleFilter === key)}
              >
                {SUPPORT_ARTICLE_CATEGORY_LABEL[key]}
              </button>
            ))}
          </div>

          {openArticle ? (
            <article className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 p-5">
              <button
                type="button"
                onClick={() => setOpenSlug(null)}
                className="mb-3 text-sm text-[var(--bn-primary)] hover:underline"
              >
                ← Voltar à lista
              </button>
              <p className="text-xs font-bold tracking-wide text-[var(--bn-muted)] uppercase">
                {SUPPORT_ARTICLE_CATEGORY_LABEL[openArticle.category]}
              </p>
              <h2 className="mt-1 font-brand-headline text-xl font-bold text-[var(--bn-on)]">
                {openArticle.title}
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--bn-on-variant)]">
                {openArticle.body.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setCategory(articleCategoryToTicket(openArticle.category));
                  goTab("contato");
                }}
                className="mt-5 text-sm font-semibold text-[var(--bn-primary)] hover:underline"
              >
                Ainda com dúvida? Falar conosco
              </button>
            </article>
          ) : (
            <ul className="space-y-2">
              {filteredArticles.map((a) => (
                <li key={a.slug}>
                  <button
                    type="button"
                    onClick={() => setOpenSlug(a.slug)}
                    className="w-full rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 px-4 py-3 text-left transition hover:border-[var(--bn-primary)]/40"
                  >
                    <p className="text-xs font-bold tracking-wide text-[var(--bn-muted)] uppercase">
                      {SUPPORT_ARTICLE_CATEGORY_LABEL[a.category]}
                    </p>
                    <p className="mt-0.5 font-semibold text-[var(--bn-on)]">
                      {a.title}
                    </p>
                    <p className="mt-1 text-sm text-[var(--bn-muted)]">
                      {a.summary}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "chamados" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3">
            <h2 className="font-brand-headline text-lg font-bold text-[var(--bn-on)]">
              Seus chamados
            </h2>
            {tickets.length === 0 ? (
              <p className="text-sm text-[var(--bn-muted)]">
                Nenhum chamado ainda. Abra um em Falar conosco.
              </p>
            ) : (
              <ul className="space-y-2">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => void loadDetail(t.id)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2.5 text-left text-sm transition",
                        selectedId === t.id
                          ? "border-[var(--bn-primary)]/50 bg-[var(--bn-primary)]/10"
                          : "border-[var(--bn-border)] hover:border-[var(--bn-primary)]/30",
                      )}
                    >
                      <p className="font-semibold text-[var(--bn-on)]">
                        {t.subject}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--bn-muted)]">
                        {SUPPORT_TICKET_CATEGORY_LABEL[t.category]} ·{" "}
                        {SUPPORT_TICKET_STATUS_LABEL[t.status]}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 p-4">
            {!detail ? (
              <p className="text-sm text-[var(--bn-muted)]">
                Selecione um chamado para ver a conversa.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-brand-headline text-lg font-bold text-[var(--bn-on)]">
                    {detail.subject}
                  </h3>
                  <p className="text-xs text-[var(--bn-muted)]">
                    {SUPPORT_TICKET_CATEGORY_LABEL[detail.category]} ·{" "}
                    {SUPPORT_TICKET_STATUS_LABEL[detail.status]}
                  </p>
                </div>
                <div className="max-h-80 space-y-3 overflow-y-auto">
                  {detail.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-xl px-3 py-2 text-sm",
                        m.authorKind === "PLATFORM"
                          ? "bg-[var(--bn-primary)]/15 text-[var(--bn-on)]"
                          : "bg-[var(--bn-hover)] text-[var(--bn-on-variant)]",
                      )}
                    >
                      <p className="text-[11px] font-bold tracking-wide uppercase opacity-70">
                        {m.authorKind === "PLATFORM"
                          ? PLATFORM_SUPPORT_DISPLAY_NAME
                          : m.authorStaff?.displayName ||
                            m.authorStaff?.email ||
                            "Você"}
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
                      rows={3}
                      placeholder="Escreva uma resposta…"
                      className={inputClass}
                      required
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-[var(--bn-primary-container)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                      Enviar
                    </button>
                  </form>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "contato" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 p-5">
            <h2 className="font-brand-headline text-lg font-bold text-[var(--bn-on)]">
              Contato rápido
            </h2>
            <p className="text-sm text-[var(--bn-muted)]">
              Prefira a central de ajuda primeiro. Se precisar falar com a gente:
            </p>
            <div className="flex flex-col gap-2">
              {contact?.whatsappHref ? (
                <a
                  href={contact.whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  WhatsApp do suporte
                </a>
              ) : (
                <p className="text-sm text-[var(--bn-muted)]">
                  WhatsApp do suporte ainda não configurado na plataforma.
                </p>
              )}
              {contact?.mailtoHref && contact.email ? (
                <a
                  href={contact.mailtoHref}
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--bn-border)] px-4 py-2.5 text-sm font-semibold text-[var(--bn-on)] transition hover:border-[var(--bn-primary)]/40"
                >
                  E-mail: {contact.email}
                </a>
              ) : (
                <p className="text-sm text-[var(--bn-muted)]">
                  E-mail do suporte ainda não configurado.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 p-5">
            <h2 className="font-brand-headline text-lg font-bold text-[var(--bn-on)]">
              Abrir chamado
            </h2>
            <p className="mt-1 text-sm text-[var(--bn-muted)]">
              Registramos no painel e a equipe Barbernegon responde por aqui.
            </p>
            <form onSubmit={onCreate} className="mt-4 space-y-3">
              <input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto"
                className={inputClass}
                maxLength={160}
              />
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as SupportTicketCategory)
                }
                className={inputClass}
              >
                {(
                  Object.keys(
                    SUPPORT_TICKET_CATEGORY_LABEL,
                  ) as SupportTicketCategory[]
                ).map((key) => (
                  <option key={key} value={key}>
                    {SUPPORT_TICKET_CATEGORY_LABEL[key]}
                  </option>
                ))}
              </select>
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Descreva o problema com o máximo de detalhe…"
                className={inputClass}
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[var(--bn-primary-container)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? "Enviando…" : "Abrir chamado"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

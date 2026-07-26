"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  organizationId: string;
  slug: string;
  name: string;
};

export function PlatformOrgActions({ organizationId, slug, name }: Props) {
  const router = useRouter();
  const [confirmSlug, setConfirmSlug] = useState("");
  const [busy, setBusy] = useState<"impersonate" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function enterAsOwner() {
    setBusy("impersonate");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/plataforma/organizations/${organizationId}/impersonate`,
        { method: "POST", credentials: "same-origin" },
      );
      const data = (await res.json()) as {
        message?: string;
        redirect?: string;
        asEmail?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível abrir o painel do salão.");
        return;
      }
      setMessage(
        data.asEmail
          ? `Entrando como ${data.asEmail}…`
          : "Abrindo painel do salão…",
      );
      window.location.href = data.redirect || "/admin";
    } catch {
      setError("Erro de rede. Tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteOrg() {
    if (confirmSlug.trim().toLowerCase() !== slug.trim().toLowerCase()) {
      setError(`Digite o slug “${slug}” para confirmar.`);
      return;
    }
    if (
      !window.confirm(
        `Excluir permanentemente “${name}” (/${slug})? Agendamentos, equipe e site serão apagados.`,
      )
    ) {
      return;
    }

    setBusy("delete");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/plataforma/organizations/${organizationId}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmSlug }),
        },
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Falha ao excluir.");
        return;
      }
      setMessage(data.message ?? "Excluída.");
      router.push("/plataforma/barbearias");
      router.refresh();
    } catch {
      setError("Erro de rede. Tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  const field =
    "mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100";

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-brand-500/25 bg-brand-500/5 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-200">
          Gerir como o salão
        </h2>
        <p className="text-sm text-zinc-400">
          Abre o painel completo do OWNER (equipe, unidades, site, caixa, etc.).
          Use “Voltar ao Ops” no topo do painel quando terminar.
        </p>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void enterAsOwner()}
          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        >
          {busy === "impersonate" ? "Abrindo…" : "Entrar no painel do salão"}
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-rose-200">
          Zona de perigo
        </h2>
        <p className="text-sm text-zinc-400">
          Exclusão permanente do perfil da barbearia. Para só tirar do ar, use
          status Cancelado e desmarque o marketplace acima.
        </p>
        <label className="block text-xs text-zinc-400">
          Digite o slug <span className="font-mono text-zinc-200">{slug}</span>{" "}
          para confirmar
          <input
            className={field}
            value={confirmSlug}
            onChange={(e) => setConfirmSlug(e.target.value)}
            placeholder={slug}
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void deleteOrg()}
          className="rounded-full border border-rose-400/40 bg-rose-500/20 px-5 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/30 disabled:opacity-60"
        >
          {busy === "delete" ? "Excluindo…" : "Excluir barbearia"}
        </button>
      </div>

      {message ? (
        <p className="text-sm text-emerald-300">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}

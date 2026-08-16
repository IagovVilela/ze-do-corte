"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { readResponseJson } from "@/lib/read-response-json";

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

export default function ConsultorBarbeariaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [org, setOrg] = useState<OrgCard | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/consultores/organizations/${id}`);
      const data = await readResponseJson<{ organization?: OrgCard }>(res);
      if (!res.ok) {
        setError(data.message ?? "Não encontrada.");
        return;
      }
      setOrg(data.organization ?? null);
    })();
  }, [id]);

  async function assist() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/consultores/organizations/${id}/assist`, {
        method: "POST",
      });
      const data = await readResponseJson<{ redirect?: string; message?: string }>(
        res,
      );
      if (!res.ok) throw new Error(data.message ?? "Falha.");
      window.location.href = data.redirect || "/admin";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
      setSaving(false);
    }
  }

  if (!org && !error) {
    return <p className="text-sm text-zinc-500">Carregando…</p>;
  }

  return (
    <div className="space-y-6">
      <Link href="/consultores/barbearias" className="text-sm text-zinc-500">
        ← Barbearias
      </Link>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {org ? (
        <div className="rounded-2xl border border-white/10 p-6">
          <h1 className="text-2xl font-semibold text-white">{org.name}</h1>
          <p className="font-mono text-sm text-zinc-500">/{org.slug}</p>
          <ul className="mt-4 space-y-1 text-sm text-zinc-300">
            <li>Cidade: {org.city ?? "—"}</li>
            <li>
              Plano: {org.planTierLabel} ({org.planStatusLabel})
            </li>
            <li>Asaas ligado: {org.asaasEnabled ? "sim" : "não"}</li>
            <li>WhatsApp: {org.whatsappConnected ? "ligado" : "não"}</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={`/${org.slug}`}
              target="_blank"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm"
            >
              Site público
            </Link>
            <button
              type="button"
              disabled={saving}
              onClick={() => void assist()}
              className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950"
            >
              Abrir painel (assistência)
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { readResponseJson } from "@/lib/read-response-json";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  planStatusLabel: string;
  planTierLabel: string;
  asaasEnabled: boolean;
  whatsappConnected: boolean;
};

export default function ConsultoresBarbeariasPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [error, setError] = useState("");

  async function load(query = q) {
    const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    const res = await fetch(`/api/consultores/organizations${params}`);
    const data = await readResponseJson<{ organizations?: OrgRow[] }>(res);
    if (!res.ok) throw new Error(data.message ?? "Falha ao listar.");
    setRows(data.organizations ?? []);
  }

  useEffect(() => {
    void load("").catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Erro.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Barbearias</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Ficha operacional. Sem chaves, faturamento ou impersonar o dono.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : null}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nome ou slug"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-zinc-950"
        >
          Buscar
        </button>
      </form>
      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {rows.map((o) => (
          <li key={o.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-zinc-100">{o.name}</p>
              <p className="text-xs text-zinc-500">
                /{o.slug} · {o.planTierLabel} · Asaas{" "}
                {o.asaasEnabled ? "ligado" : "não"} · WhatsApp{" "}
                {o.whatsappConnected ? "ligado" : "não"}
              </p>
            </div>
            <Link
              href={`/consultores/barbearias/${o.id}`}
              className="text-sm text-brand-300"
            >
              Abrir
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

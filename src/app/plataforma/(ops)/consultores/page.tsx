"use client";

import { FormEvent, useEffect, useState } from "react";

import { readResponseJson } from "@/lib/read-response-json";

type Consultant = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  createdAt: string;
};

type AuditRow = {
  id: string;
  action: string;
  createdAt: string;
  ticketId: string | null;
  consultantStaff: { email: string; displayName: string | null };
  organization: { name: string; slug: string } | null;
};

export default function PlataformaConsultoresPage() {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [cRes, aRes] = await Promise.all([
      fetch("/api/plataforma/consultores"),
      fetch("/api/plataforma/consultores/audit"),
    ]);
    const cData = await readResponseJson<{ consultants?: Consultant[] }>(cRes);
    const aData = await readResponseJson<{ logs?: AuditRow[] }>(aRes);
    if (!cRes.ok) throw new Error(cData.message ?? "Falha ao listar consultores.");
    setConsultants(cData.consultants ?? []);
    setLogs(aData.logs ?? []);
  }

  useEffect(() => {
    void load().catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Erro.");
    });
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/plataforma/consultores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName, password }),
      });
      const data = await readResponseJson(res);
      if (!res.ok) throw new Error(data.message ?? "Não foi possível criar.");
      setEmail("");
      setDisplayName("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Consultant) {
    setSaving(true);
    try {
      const res = await fetch(`/api/plataforma/consultores/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      const data = await readResponseJson(res);
      if (!res.ok) throw new Error(data.message ?? "Falha.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Consultores</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Contas do console <span className="font-mono">/consultores</span>. Não
          acessam o Ops nem impersonam o dono.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-4"
      >
        <input
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Nome"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
        />
        <input
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
        />
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-zinc-950"
        >
          Criar consultor
        </button>
      </form>

      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {consultants.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-zinc-100">
                {c.displayName || c.email}
              </p>
              <p className="text-xs text-zinc-500">{c.email}</p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void toggleActive(c)}
              className="text-xs font-semibold text-brand-300"
            >
              {c.isActive ? "Desativar" : "Reativar"}
            </button>
          </li>
        ))}
      </ul>

      <div>
        <h2 className="text-lg font-semibold text-white">Auditoria recente</h2>
        <ul className="mt-3 space-y-2 text-xs text-zinc-400">
          {logs.map((l) => (
            <li key={l.id}>
              {new Date(l.createdAt).toLocaleString("pt-BR")} ·{" "}
              {l.consultantStaff.displayName || l.consultantStaff.email} ·{" "}
              {l.action}
              {l.organization ? ` · ${l.organization.name}` : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

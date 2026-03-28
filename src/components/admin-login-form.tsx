"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  redirectTo: string;
};

export function AdminLoginForm({ redirectTo }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { message?: string; redirect?: string };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível entrar.");
        return;
      }
      router.push(data.redirect ?? redirectTo);
      router.refresh();
    } catch {
      setError("Erro de rede. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand-500/60";

  return (
    <form
      noValidate
      onSubmit={(e) => void onSubmit(e)}
      className="glass-card w-full max-w-md space-y-4 rounded-2xl border border-white/10 p-8"
    >
      <div>
        <h1 className="text-xl font-semibold text-white">Entrar no painel</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Use o e-mail e a senha cadastrados na equipe.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <label className="block space-y-1.5 text-sm">
        <span className="text-zinc-400">E-mail</span>
        <input
          className={input}
          type="text"
          inputMode="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="text-zinc-400">Senha</span>
        <input
          className={input}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-500 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-brand-400 disabled:opacity-50"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

function slugifyPreview(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export default function CadastroPage() {
  const router = useRouter();
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previewSlug = useMemo(() => {
    if (slugTouched && slug.trim()) return slug.trim().toLowerCase();
    return slugifyPreview(shopName) || "minha-barbearia";
  }, [shopName, slug, slugTouched]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          slug: previewSlug,
          ownerName,
          email,
          password,
        }),
      });
      const data = (await res.json()) as { message?: string; redirect?: string };
      if (!res.ok) throw new Error(data.message ?? "Falha no cadastro.");
      router.push(data.redirect ?? "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-[#0a0e13]/70 px-4 py-3 text-[#e2eaf4] outline-none transition placeholder:text-[#7a889c] focus:border-[#3b82f6]/60 focus:ring-2 focus:ring-[#3b82f6]/20";

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#0f1419] text-[#e2eaf4]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.28),transparent_55%),radial-gradient(ellipse_50%_40%_at_90%_10%,rgba(142,182,255,0.12),transparent_50%)]"
      />
      <div className="relative mx-auto flex min-h-svh max-w-lg flex-col justify-center px-4 py-16">
        <Link
          href="/"
          className="mb-8 text-2xl font-semibold tracking-tight text-[#8eb6ff] transition hover:text-white"
        >
          Barbernegon
        </Link>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Crie sua barbearia
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#a8b6c9]">
          Em minutos você tem site próprio, agendamento e painel — sem
          burocracia.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="text-[#a8b6c9]">Nome da barbearia</span>
            <input
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className={inputClass}
              placeholder="Ex.: Barbearia do João"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="text-[#a8b6c9]">Endereço do site</span>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-[#7a889c]">/</span>
              <input
                value={slugTouched ? slug : previewSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                className={inputClass}
                placeholder="barbearia-do-joao"
              />
            </div>
            <span className="text-xs text-[#7a889c]">
              Seu site: barbernegon.com/{previewSlug}
            </span>
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="text-[#a8b6c9]">Seu nome</span>
            <input
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="text-[#a8b6c9]">E-mail</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              autoComplete="email"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="text-[#a8b6c9]">Senha</span>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
              minLength={6}
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#3b82f6] px-6 py-3 text-sm font-bold text-white shadow-[0_0_24px_-6px_rgba(59,130,246,0.55)] transition hover:bg-[#2563eb] disabled:opacity-60"
          >
            {loading ? "Criando…" : "Começar grátis"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#7a889c]">
          Já tem conta?{" "}
          <Link
            href="/admin/login"
            className="text-[#8eb6ff] underline-offset-2 hover:underline"
          >
            Entrar no painel
          </Link>
        </p>
      </div>
    </div>
  );
}

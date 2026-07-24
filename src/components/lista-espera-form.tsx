"use client";

import Image from "next/image";
import { useState } from "react";

import { formatWhatsAppDisplayInput } from "@/lib/phone-to-whatsapp-link";
import { cn } from "@/lib/utils";

export function ListaEsperaForm({ className }: { className?: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          shopName,
          city: city || null,
          email: email || null,
          note: note || null,
          website,
        }),
      });
      const raw = await res.text();
      let data: { message?: string } = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as { message?: string };
        } catch {
          throw new Error(
            res.ok
              ? "Resposta inválida do servidor."
              : "Não foi possível enviar. Tente de novo.",
          );
        }
      }
      if (!res.ok) {
        throw new Error(data.message ?? "Não foi possível enviar.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setPending(false);
    }
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#3B82F6]/50";

  return (
    <div
      className={cn(
        "brand-onyx flex min-h-svh flex-col bg-[#0b0d12] text-white",
        className,
      )}
    >
      <header className="border-b border-white/10 px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-2.5">
          <Image
            src="/images/barbernegon-logo.png"
            alt=""
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="font-[family-name:var(--font-auth-headline)] text-lg font-bold tracking-tight">
            Barbernegon
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10 sm:py-14">
        <p className="text-[11px] font-bold tracking-[0.12em] text-[#3B82F6] uppercase">
          Lista de interesse
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-auth-headline)] text-3xl font-bold tracking-tight sm:text-4xl">
          Quer o site e a agenda da sua barbearia?
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
          Deixe seus dados. Entramos em contato pelo WhatsApp — sem compromisso.
        </p>

        {done ? (
          <div className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-sm text-emerald-200">
            <p className="font-semibold text-emerald-100">Recebemos seus dados</p>
            <p className="mt-2 text-emerald-200/90">
              Em breve falamos com você no WhatsApp. Obrigado pelo interesse.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="relative mt-8 space-y-4">
            <label className="block space-y-1.5 text-sm">
              <span className="text-zinc-400">Seu nome</span>
              <input
                className={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                maxLength={120}
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-zinc-400">WhatsApp</span>
              <input
                className={input}
                value={phone}
                onChange={(e) =>
                  setPhone(formatWhatsAppDisplayInput(e.target.value))
                }
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="(12) 99999-9999"
                maxLength={32}
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-zinc-400">Nome da barbearia</span>
              <input
                className={input}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
                maxLength={120}
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-zinc-400">Cidade (opcional)</span>
              <input
                className={input}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={80}
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-zinc-400">E-mail (opcional)</span>
              <input
                className={input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                maxLength={160}
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-zinc-400">Observação (opcional)</span>
              <textarea
                className={cn(input, "min-h-[88px] resize-y")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={400}
              />
            </label>

            {/* Honeypot */}
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
              <label>
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>

            {error ? (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#3B82F6] px-5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {pending ? "Enviando…" : "Quero ser contatado"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

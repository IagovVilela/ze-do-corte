"use client";

import { CalendarClock, Globe2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import {
  AuthError,
  AuthField,
  AuthLabelCaps,
  AuthPasswordField,
  AuthSubmitButton,
  authInputClass,
} from "@/components/auth/auth-fields";
import { AuthShell } from "@/components/auth/auth-shell";
import { cn } from "@/lib/utils";

function slugifyPreview(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const highlights = [
  {
    icon: Globe2,
    title: "Site com a sua cara",
    body: "Endereço próprio e identidade exclusiva, sem logo de terceiros.",
  },
  {
    icon: CalendarClock,
    title: "Agenda sem WhatsApp infinito",
    body: "O cliente escolhe o horário; você só recebe a confirmação.",
  },
  {
    icon: Wallet,
    title: "Caixa e clube no mesmo painel",
    body: "Financeiro claro e assinaturas para fidelizar os melhores clientes.",
  },
] as const;

type Props = {
  className?: string;
};

export function CadastroClient({ className }: Props) {
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

  const aside = (
    <>
      <AuthLabelCaps>Feito para barbeiros exigentes</AuthLabelCaps>
      <p className="mt-3 max-w-md font-[family-name:var(--font-auth-headline)] text-4xl leading-[1.12] font-bold tracking-tight text-white xl:text-5xl">
        Sua barbearia.
        <br />
        Sua cara.
      </p>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#c2c6d6]">
        Identidade digital exclusiva para quem não abre mão da excelência em
        cada detalhe.
      </p>

      <ul className="mt-10 max-w-md space-y-5">
        {highlights.map((item) => (
          <li key={item.title} className="flex items-start gap-4">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#adc6ff] backdrop-blur-sm">
              <item.icon className="size-5" strokeWidth={1.5} />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-white">
                {item.title}
              </span>
              <span className="mt-0.5 block text-sm leading-relaxed text-[#c2c6d6]">
                {item.body}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-10 border-l-2 border-[#3B82F6] pl-4 text-sm leading-relaxed text-[#9CA3AF]">
        Pronto em minutos. Não em semanas.
      </p>
    </>
  );

  const mobileBanner = (
    <>
      <AuthLabelCaps>Feito para barbeiros exigentes</AuthLabelCaps>
      <p className="mt-2 font-[family-name:var(--font-auth-headline)] text-xl font-bold tracking-tight text-white">
        Sua barbearia. Sua cara.
      </p>
      <p className="mt-1 text-sm text-[#c2c6d6]">
        Site próprio, agenda e caixa — pronto em minutos.
      </p>
    </>
  );

  return (
    <AuthShell className={className} aside={aside} mobileBanner={mobileBanner}>
      <div className="lg:py-6">
        <AuthLabelCaps>Começar</AuthLabelCaps>
        <h1 className="mt-2 font-[family-name:var(--font-auth-headline)] text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Crie sua barbearia
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#c2c6d6]">
          Em minutos: site próprio, agendamento e painel — sem burocracia.
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          {error ? <AuthError>{error}</AuthError> : null}

          <AuthField
            label="Nome da barbearia"
            required
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="Ex.: Barbearia do João"
          />

          <label className="block space-y-1.5 text-sm">
            <span className="text-[#c2c6d6]">Endereço do site</span>
            <div className="flex items-stretch overflow-hidden rounded-lg border border-[#2F3336] bg-[#0b0e15]/80 transition focus-within:border-[#3B82F6]/70 focus-within:ring-2 focus-within:ring-[#3B82F6]/20">
              <span className="flex items-center border-r border-[#2F3336] bg-white/[0.03] px-3 text-sm text-[#9CA3AF]">
                barbernegon.com/
              </span>
              <input
                value={slugTouched ? slug : previewSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  );
                }}
                className={cn(
                  authInputClass,
                  "rounded-none border-0 bg-transparent focus:ring-0",
                )}
                placeholder="barbearia-do-joao"
                aria-label="Slug do site"
              />
            </div>
            <span className="block text-xs text-[#9CA3AF]">
              Este será o endereço público do seu site.
            </span>
          </label>

          <AuthField
            label="Seu nome"
            required
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            autoComplete="name"
          />
          <AuthField
            label="E-mail"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <AuthPasswordField
            label="Senha"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            hint="Mínimo de 6 caracteres."
          />

          <div className="pt-1">
            <AuthSubmitButton pending={loading} pendingLabel="Criando…">
              Começar grátis
            </AuthSubmitButton>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-[#9CA3AF]">
          Já tem conta?{" "}
          <Link
            href="/admin/login"
            className="font-medium text-[#adc6ff] underline-offset-2 hover:underline"
          >
            Entrar no painel
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AuthError,
  AuthField,
  AuthLabelCaps,
  AuthPasswordField,
  AuthSubmitButton,
} from "@/components/auth/auth-fields";
import { AuthShell } from "@/components/auth/auth-shell";

type Props = {
  redirectTo: string;
  className?: string;
};

export function AdminLoginForm({ redirectTo, className }: Props) {
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
        setError(data.message ?? "E-mail ou senha inválidos.");
        return;
      }
      router.push(redirectTo || data.redirect || "/admin");
      router.refresh();
    } catch {
      setError("Erro de rede. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell className={className}>
      <div className="rounded-xl border border-[#2F3336] bg-[#25282B]/55 p-6 shadow-[0_24px_64px_-32px_rgba(0,0,0,0.65)] backdrop-blur-md sm:p-8">
        <AuthLabelCaps>Painel</AuthLabelCaps>
        <h1 className="mt-2 font-[family-name:var(--font-auth-headline)] text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Entrar no painel
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#c2c6d6]">
          Use o e-mail e a senha da sua equipe.
        </p>

        <form
          noValidate
          onSubmit={(e) => void onSubmit(e)}
          className="mt-7 space-y-4"
        >
          {error ? <AuthError>{error}</AuthError> : null}

          <AuthField
            label="E-mail"
            type="text"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <AuthPasswordField
            label="Senha"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <AuthSubmitButton pending={pending} pendingLabel="Entrando…">
            Entrar
          </AuthSubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-[#9CA3AF]">
          Ainda não tem barbearia?{" "}
          <Link
            href="/cadastro"
            className="font-medium text-[#adc6ff] underline-offset-2 hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

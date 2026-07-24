"use client";

import Link from "next/link";
import { useState } from "react";

import {
  AuthError,
  AuthField,
  AuthLabelCaps,
  AuthSubmitButton,
} from "@/components/auth/auth-fields";
import { AuthShell } from "@/components/auth/auth-shell";

type Props = {
  className?: string;
};

export function ForgotPasswordForm({ className }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      let data: { message?: string } = {};
      try {
        data = (await res.json()) as { message?: string };
      } catch {
        /* resposta não-JSON (ex.: 500 HTML) */
      }
      if (!res.ok) {
        setError(
          data.message ??
            "Não foi possível enviar o link. Tente de novo em instantes.",
        );
        return;
      }
      setSuccess(
        data.message ??
          "Se existir uma conta com este e-mail, enviamos um link para redefinir a senha.",
      );
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
          Esqueci minha senha
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#c2c6d6]">
          Informe o e-mail da sua conta. Se ele estiver cadastrado, enviamos um
          link seguro para criar uma nova senha (válido por 1 hora).
        </p>

        {success ? (
          <div className="mt-7 space-y-4">
            <p
              role="status"
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
            >
              {success}
            </p>
            <p className="text-center text-sm text-[#9CA3AF]">
              <Link
                href="/admin/login"
                className="font-medium text-[#adc6ff] underline-offset-2 hover:underline"
              >
                Voltar ao login
              </Link>
            </p>
          </div>
        ) : (
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

            <AuthSubmitButton pending={pending} pendingLabel="Enviando…">
              Enviar link
            </AuthSubmitButton>
          </form>
        )}

        {!success ? (
          <p className="mt-6 text-center text-sm text-[#9CA3AF]">
            Lembrou a senha?{" "}
            <Link
              href="/admin/login"
              className="font-medium text-[#adc6ff] underline-offset-2 hover:underline"
            >
              Entrar
            </Link>
          </p>
        ) : null}
      </div>
    </AuthShell>
  );
}

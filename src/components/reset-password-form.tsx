"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AuthError,
  AuthLabelCaps,
  AuthPasswordField,
  AuthSubmitButton,
} from "@/components/auth/auth-fields";
import { AuthShell } from "@/components/auth/auth-shell";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

type Props = {
  token: string;
  className?: string;
};

export function ResetPasswordForm({ token, className }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível redefinir a senha.");
        return;
      }
      router.push("/admin/login?reset=1");
      router.refresh();
    } catch {
      setError("Erro de rede. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <AuthShell className={className}>
        <div className="rounded-xl border border-[#2F3336] bg-[#25282B]/55 p-6 shadow-[0_24px_64px_-32px_rgba(0,0,0,0.65)] backdrop-blur-md sm:p-8">
          <AuthLabelCaps>Painel</AuthLabelCaps>
          <h1 className="mt-2 font-[family-name:var(--font-auth-headline)] text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Link inválido
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#c2c6d6]">
            Este link de redefinição está incompleto. Peça um novo em “Esqueci
            minha senha”.
          </p>
          <p className="mt-6 text-center text-sm text-[#9CA3AF]">
            <Link
              href="/admin/esqueci-senha"
              className="font-medium text-[#adc6ff] underline-offset-2 hover:underline"
            >
              Pedir novo link
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell className={className}>
      <div className="rounded-xl border border-[#2F3336] bg-[#25282B]/55 p-6 shadow-[0_24px_64px_-32px_rgba(0,0,0,0.65)] backdrop-blur-md sm:p-8">
        <AuthLabelCaps>Painel</AuthLabelCaps>
        <h1 className="mt-2 font-[family-name:var(--font-auth-headline)] text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Nova senha
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#c2c6d6]">
          Escolha uma senha nova para acessar o painel. Depois disso, você
          precisará entrar de novo em todos os dispositivos.
        </p>

        <form
          noValidate
          onSubmit={(e) => void onSubmit(e)}
          className="mt-7 space-y-4"
        >
          {error ? <AuthError>{error}</AuthError> : null}

          <AuthPasswordField
            label="Nova senha"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.`}
            required
          />
          <AuthPasswordField
            label="Confirmar senha"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <AuthSubmitButton pending={pending} pendingLabel="Salvando…">
            Salvar senha
          </AuthSubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-[#9CA3AF]">
          <Link
            href="/admin/login"
            className="font-medium text-[#adc6ff] underline-offset-2 hover:underline"
          >
            Voltar ao login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

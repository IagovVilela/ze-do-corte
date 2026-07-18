"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

export type FeatureToggleState = {
  marketplaceListed: boolean;
  whatsappBotEnabled: boolean;
  asaasEnabled: boolean;
  hideChecklist: boolean;
  /** Há Phone Number ID / token — bot pode ser ligado. */
  whatsappConnected: boolean;
  /** Há API key Asaas configurada. */
  asaasConfigured: boolean;
};

type Props = {
  initial: FeatureToggleState;
  canManageBranding: boolean;
  canManagePayments: boolean;
  canManageSettings: boolean;
};

type ToggleKey =
  | "marketplaceListed"
  | "whatsappBotEnabled"
  | "asaasEnabled"
  | "hideChecklist";

function Switch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bn-primary)] disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "bg-[var(--bn-primary-container)]"
          : "bg-[var(--bn-surface-container)] ring-1 ring-[var(--bn-border)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-0.5 size-6 rounded-full bg-white shadow transition",
          checked ? "left-[1.35rem]" : "left-0.5",
        )}
      />
    </button>
  );
}

/**
 * Atalhos liga/desliga de funções da org (APIs existentes).
 */
export function AdminConfigFeatureToggles({
  initial,
  canManageBranding,
  canManagePayments,
  canManageSettings,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [pending, setPending] = useState<ToggleKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showSection =
    canManageBranding || canManagePayments || canManageSettings;
  if (!showSection) return null;

  async function patch(
    key: ToggleKey,
    next: boolean,
    request: () => Promise<Response>,
  ) {
    setError(null);
    setMessage(null);
    setPending(key);
    const prev = state[key];
    setState((s) => ({ ...s, [key]: next }));
    try {
      const res = await request();
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) {
        setState((s) => ({ ...s, [key]: prev }));
        setError(data.message ?? "Não foi possível atualizar.");
        return;
      }
      setMessage("Preferência atualizada.");
      router.refresh();
    } catch {
      setState((s) => ({ ...s, [key]: prev }));
      setError("Falha de rede. Tente de novo.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section
      id="funcoes"
      className="bn-card scroll-mt-24 rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-5 sm:p-6"
    >
      <h2 className="font-brand-headline text-lg font-bold tracking-tight text-[var(--bn-on)]">
        Funções da barbearia
      </h2>
      <p className="mt-1 text-sm text-[var(--bn-muted)]">
        Ligue ou desligue recursos sem abrir cada tela. Configuração completa
        continua nas páginas indicadas.
      </p>

      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-[var(--bn-status-ok)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-[var(--bn-status-danger)]">
          {error}
        </p>
      ) : null}

      <ul className="mt-5 divide-y divide-[var(--bn-border)]">
        {canManageBranding ? (
          <li className="flex items-start justify-between gap-4 py-4 first:pt-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--bn-on)]">
                Aparecer no marketplace
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--bn-muted)]">
                Quando desligado, o salão some da busca em{" "}
                <span className="text-[var(--bn-on-variant)]">/explorar</span>.
              </p>
              <Link
                href="/admin/marca"
                className="mt-1.5 inline-block text-xs font-medium text-[var(--bn-primary)] hover:underline"
              >
                Gerenciar em Marca
              </Link>
            </div>
            <Switch
              label="Aparecer no marketplace"
              checked={state.marketplaceListed}
              disabled={pending === "marketplaceListed"}
              onChange={(next) =>
                void patch("marketplaceListed", next, () =>
                  fetch("/api/admin/organization", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ marketplaceListed: next }),
                  }),
                )
              }
            />
          </li>
        ) : null}

        {canManageBranding ? (
          <li className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--bn-on)]">
                Assistente no WhatsApp
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--bn-muted)]">
                Quando desligado, o bot deixa de responder. A conexão e o número
                do site permanecem.
                {!state.whatsappConnected ? (
                  <span className="mt-1 block text-[var(--bn-status-warn)]">
                    Conecte o WhatsApp antes de ligar o assistente.
                  </span>
                ) : null}
              </p>
              <Link
                href="/admin/whatsapp"
                className="mt-1.5 inline-block text-xs font-medium text-[var(--bn-primary)] hover:underline"
              >
                Gerenciar em WhatsApp
              </Link>
            </div>
            <Switch
              label="Assistente no WhatsApp"
              checked={state.whatsappBotEnabled}
              disabled={
                pending === "whatsappBotEnabled" ||
                (!state.whatsappConnected && !state.whatsappBotEnabled)
              }
              onChange={(next) =>
                void patch("whatsappBotEnabled", next, () =>
                  fetch("/api/admin/whatsapp", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ whatsappBotEnabled: next }),
                  }),
                )
              }
            />
          </li>
        ) : null}

        {canManagePayments ? (
          <li className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--bn-on)]">
                Receber pagamentos (Asaas)
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--bn-muted)]">
                Quando desligado, PIX e clube do salão não usam a conta Asaas.
                {!state.asaasConfigured ? (
                  <span className="mt-1 block text-[var(--bn-status-warn)]">
                    Cadastre a chave API em Pagamentos para ativar.
                  </span>
                ) : null}
              </p>
              <Link
                href="/admin/pagamentos"
                className="mt-1.5 inline-block text-xs font-medium text-[var(--bn-primary)] hover:underline"
              >
                Gerenciar em Pagamentos
              </Link>
            </div>
            <Switch
              label="Receber pagamentos Asaas"
              checked={state.asaasEnabled}
              disabled={
                pending === "asaasEnabled" ||
                (!state.asaasConfigured && !state.asaasEnabled)
              }
              onChange={(next) =>
                void patch("asaasEnabled", next, () =>
                  fetch("/api/admin/payments", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ asaasEnabled: next }),
                  }),
                )
              }
            />
          </li>
        ) : null}

        {canManageBranding ? (
          <li className="flex items-start justify-between gap-4 py-4 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--bn-on)]">
                Checklist “Primeiros passos”
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--bn-muted)]">
                Quando desligado, o card de configuração inicial some da visão
                geral do painel.
              </p>
            </div>
            <Switch
              label="Mostrar checklist Primeiros passos"
              checked={!state.hideChecklist}
              disabled={pending === "hideChecklist"}
              onChange={(show) => {
                const hide = !show;
                void patch("hideChecklist", hide, () =>
                  fetch("/api/admin/organization", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      onboardingJson: { hideChecklist: hide },
                    }),
                  }),
                );
              }}
            />
          </li>
        ) : null}
      </ul>
    </section>
  );
}

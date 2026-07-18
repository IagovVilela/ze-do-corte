"use client";

import Link from "next/link";
import { useState } from "react";

import { PAGE_TEMPLATE_META } from "@/lib/canvas-page-templates";
import type { CanvasTemplateId } from "@/lib/site-canvas";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

type Props = {
  open: boolean;
  busy?: boolean;
  orgSlug: string;
  onPickTemplate: (id: CanvasTemplateId) => void;
  onOpenTheme: () => void;
  onPublish: () => void;
  onSkip: () => void;
};

export function CanvasOnboarding({
  open,
  busy,
  orgSlug,
  onPickTemplate,
  onOpenTheme,
  onPublish,
  onSkip,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [picked, setPicked] = useState<CanvasTemplateId | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[var(--bn-scrim)]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="canvas-onboard-title"
        className="relative z-[1] flex max-h-[min(94svh,780px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--bn-border)] shadow-2xl max-sm:rounded-b-none"
        style={{ backgroundColor: "var(--bn-surface-elevated)" }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--bn-border)] px-4 py-4 sm:px-5">
          <div>
            <p className="text-[11px] font-bold tracking-[0.1em] text-[var(--bn-primary)] uppercase">
              Primeiros passos · {step} de 3
            </p>
            <h2
              id="canvas-onboard-title"
              className="font-brand-headline mt-1 text-xl font-bold tracking-tight text-[var(--bn-on)] sm:text-2xl"
            >
              {step === 1
                ? "Escolha um modelo"
                : step === 2
                  ? "Ajuste a marca"
                  : "Publique e veja no ar"}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--bn-on-variant)]">
              {step === 1
                ? "Comece com um layout pronto. Você pode trocar depois."
                : step === 2
                  ? "Cores e tipografia no editor, logo e redes em Marca."
                  : "Publicar atualiza o site que seus clientes veem."}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onSkip}
            className="shrink-0 rounded-lg border border-[var(--bn-border)] px-3 py-1.5 text-xs text-[var(--bn-muted)] transition hover:bg-[var(--bn-hover)] hover:text-[var(--bn-on)]"
          >
            Pular
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {step === 1 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {PAGE_TEMPLATE_META.map((tpl) => {
                const active = picked === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    disabled={busy}
                    onClick={() => setPicked(tpl.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition disabled:opacity-50",
                      active
                        ? "border-[var(--bn-primary)]/50 bg-[var(--bn-primary-container)]/15"
                        : "border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/50 hover:border-[var(--bn-primary)]/35",
                    )}
                  >
                    <div
                      className="mb-3 h-14 overflow-hidden rounded-lg border border-[var(--bn-border)]"
                      style={{
                        background: `linear-gradient(135deg, ${tpl.swatch} 0%, #0b0e15 72%)`,
                      }}
                    />
                    <p className="text-sm font-semibold text-[var(--bn-on)]">
                      {tpl.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--bn-muted)]">
                      {tpl.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <button
                type="button"
                className="w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/50 px-4 py-4 text-left transition hover:border-[var(--bn-primary)]/35"
                onClick={onOpenTheme}
              >
                <p className="text-sm font-semibold text-[var(--bn-on)]">
                  Ajustar cores no editor
                </p>
                <p className="mt-1 text-xs text-[var(--bn-muted)]">
                  Abre o painel de tema (cores, fundo e tipografia).
                </p>
              </button>
              <Link
                href="/admin/marca"
                className="block w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/50 px-4 py-4 transition hover:border-[var(--bn-primary)]/35"
              >
                <p className="text-sm font-semibold text-[var(--bn-on)]">
                  Ir para Marca
                </p>
                <p className="mt-1 text-xs text-[var(--bn-muted)]">
                  Logo, slug, redes e identidade cadastral.
                </p>
              </Link>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 p-5">
              <p className="text-sm text-[var(--bn-on-variant)]">
                Ao publicar, o endereço{" "}
                <span className="font-medium text-[var(--bn-primary)]">
                  /{orgSlug}
                </span>{" "}
                passa a mostrar o que está no canvas agora.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--bn-border)] px-4 py-3 sm:px-5">
          <button
            type="button"
            disabled={busy || step === 1}
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
            className="rounded-lg border border-[var(--bn-border)] px-3 py-2 text-sm text-[var(--bn-on-variant)] disabled:opacity-40"
          >
            Voltar
          </button>
          {step === 1 ? (
            <button
              type="button"
              disabled={busy || !picked}
              onClick={() => {
                if (!picked) return;
                onPickTemplate(picked);
                setStep(2);
              }}
              className="rounded-lg bg-[var(--bn-primary-container)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Usar este modelo
            </button>
          ) : null}
          {step === 2 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep(3)}
              className="rounded-lg bg-[var(--bn-primary-container)] px-4 py-2 text-sm font-bold text-white"
            >
              Continuar
            </button>
          ) : null}
          {step === 3 ? (
            <button
              type="button"
              disabled={busy}
              onClick={onPublish}
              className="rounded-lg bg-[var(--bn-primary-container)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Publicar e ver site
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

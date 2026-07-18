"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export function CanvasConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Continuar",
  cancelLabel = "Cancelar",
  busy,
  tone = "default",
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--bn-scrim)]"
        aria-label="Fechar"
        disabled={busy}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="canvas-confirm-title"
        className="relative z-[1] w-full max-w-md rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-5 shadow-2xl max-sm:rounded-b-none"
      >
        <h2
          id="canvas-confirm-title"
          className="font-brand-headline text-lg font-bold tracking-tight text-[var(--bn-on)]"
        >
          {title}
        </h2>
        {description ? (
          <div className="mt-2 text-sm leading-relaxed text-[var(--bn-on-variant)]">
            {description}
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-[var(--bn-border)] px-4 py-2.5 text-sm font-medium text-[var(--bn-on-variant)] transition hover:bg-[var(--bn-hover)] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(
              "rounded-lg px-4 py-2.5 text-sm font-bold transition disabled:opacity-50",
              tone === "danger"
                ? "bg-rose-600 text-white hover:bg-rose-500"
                : "bg-[var(--bn-primary-container)] text-white hover:brightness-110",
            )}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

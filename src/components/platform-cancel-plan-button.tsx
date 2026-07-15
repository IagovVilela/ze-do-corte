"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  planStatus: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED";
  planCancelAt: string | null;
};

export function PlatformCancelPlanButton({ planStatus, planCancelAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const cancelScheduled =
    planStatus === "ACTIVE" &&
    planCancelAt != null &&
    new Date(planCancelAt).getTime() > Date.now();

  const canCancel = planStatus !== "CANCELLED" && !cancelScheduled;
  const cancelAtLabel = planCancelAt
    ? new Date(planCancelAt).toLocaleDateString("pt-BR")
    : null;

  async function cancelPlan() {
    const confirmMsg =
      planStatus === "ACTIVE"
        ? "Cancelar a assinatura? Você continua com acesso até o fim do período já pago. Depois o status fica Cancelado."
        : "Encerrar o trial/plano agora? O status passará a Cancelado.";
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/platform/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { message?: string };
      setMessage(data.message ?? (res.ok ? "Ok." : "Falha."));
      if (res.ok) router.refresh();
    } catch {
      setMessage("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  async function undoCancel() {
    if (
      !window.confirm(
        "Desfazer o cancelamento? A cobrança mensal voltará a ser gerada.",
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/platform/billing/undo-cancel", {
        method: "POST",
      });
      const data = (await res.json()) as { message?: string };
      setMessage(data.message ?? (res.ok ? "Ok." : "Falha."));
      if (res.ok) router.refresh();
    } catch {
      setMessage("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  if (planStatus === "CANCELLED") {
    return (
      <p className="text-sm text-zinc-500">
        Plano cancelado. Para voltar, assine um plano abaixo.
      </p>
    );
  }

  return (
    <div className="space-y-3 border-t border-white/10 pt-5">
      <p className="text-sm font-medium text-zinc-200">Cancelar plano</p>
      {cancelScheduled ? (
        <>
          <p className="text-sm text-amber-200/90">
            Cancelamento agendado. Acesso até{" "}
            <span className="font-medium text-amber-100">{cancelAtLabel}</span>
            . Depois o status fica Cancelado e a barbearia sai do marketplace.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void undoCancel()}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/5 disabled:opacity-60"
          >
            {loading ? "Aguarde…" : "Desfazer cancelamento"}
          </button>
        </>
      ) : canCancel ? (
        <>
          <p className="text-xs text-zinc-500">
            {planStatus === "ACTIVE"
              ? "No plano ativo, paramos as cobranças e você usa até o fim do período pago."
              : "Trial ou pagamento pendente: o status muda para Cancelado na hora."}
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void cancelPlan()}
            className="rounded-full border border-rose-500/40 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/10 disabled:opacity-60"
          >
            {loading
              ? "Cancelando…"
              : planStatus === "ACTIVE"
                ? "Cancelar assinatura"
                : "Cancelar plano"}
          </button>
        </>
      ) : null}
      {message ? <p className="text-xs text-zinc-400">{message}</p> : null}
    </div>
  );
}

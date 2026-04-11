"use client";

import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

type ManageAppointmentPayload = {
  id: string;
  status: string;
  clientName: string;
  clientPhone: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
  };
  unitName: string | null;
  staffMemberId: string | null;
  staffDisplayName: string | null;
  canManage: boolean;
  manageBlockedReason: string | null;
};

type Props = {
  token: string;
};

const dateRange = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));

export function ManageReservationClient({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ManageAppointmentPayload | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [rescheduleDate, setRescheduleDate] = useState(
    format(dateRange[0], "yyyy-MM-dd"),
  );
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/appointments/manage/${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );
      const payload = (await res.json()) as {
        message?: string;
        appointment?: ManageAppointmentPayload;
      };
      if (!res.ok) {
        setError(payload.message ?? "Não foi possível carregar.");
        setData(null);
        return;
      }
      if (!payload.appointment) {
        setError("Resposta inválida.");
        setData(null);
        return;
      }
      setData(payload.appointment);
      setRescheduleDate(
        format(parseISO(payload.appointment.startsAt), "yyyy-MM-dd"),
      );
    } catch {
      setError("Erro de rede.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.canManage || !data.service.id) return;

    const staffQ =
      data.staffMemberId && data.staffMemberId.length > 0
        ? `&staffMemberId=${encodeURIComponent(data.staffMemberId)}`
        : "";

    const run = async () => {
      setLoadingSlots(true);
      setSelectedTime("");
      try {
        const res = await fetch(
          `/api/appointments/available?serviceId=${encodeURIComponent(data.service.id)}&date=${rescheduleDate}${staffQ}`,
        );
        if (!res.ok) {
          setSlots([]);
          return;
        }
        const json = (await res.json()) as { availableSlots?: string[] };
        setSlots(json.availableSlots ?? []);
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    void run();
  }, [data?.canManage, data?.service.id, data?.staffMemberId, rescheduleDate]);

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const manageUrl = origin
    ? `${origin}/minha-reserva/${encodeURIComponent(token)}`
    : "";

  async function handleCancel() {
    if (!data?.canManage) return;
    if (!window.confirm("Cancelar este agendamento? Esta ação não pode ser desfeita pelo site.")) {
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/appointments/manage/${encodeURIComponent(token)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) {
        setActionMessage(payload.message ?? "Não foi possível cancelar.");
        return;
      }
      setActionMessage("Agendamento cancelado.");
      await load();
    } catch {
      setActionMessage("Erro de rede.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReschedule() {
    if (!data?.canManage || !selectedTime) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/appointments/manage/${encodeURIComponent(token)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          date: rescheduleDate,
          time: selectedTime,
        }),
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) {
        setActionMessage(payload.message ?? "Não foi possível remarcar.");
        return;
      }
      setActionMessage("Horário atualizado com sucesso.");
      setSelectedTime("");
      await load();
    } catch {
      setActionMessage("Erro de rede.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-zinc-400">
        <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden />
        Carregando reserva…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card mx-auto max-w-lg rounded-3xl p-8 text-center">
        <p className="text-lg text-rose-300">{error ?? "Reserva não encontrada."}</p>
        <p className="mt-3 text-sm text-zinc-500">
          Confirme se copiou o link completo enviado após o agendamento.
        </p>
        <Link
          href="/agendar"
          className="mt-6 inline-block rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-zinc-950"
        >
          Nova reserva
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-6 sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Sua reserva
        </p>
        <h1 className="font-display mt-2 text-2xl font-semibold text-white">
          {data.service.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {format(parseISO(data.startsAt), "EEEE, dd 'de' MMMM yyyy", {
            locale: ptBR,
          })}{" "}
          · {format(parseISO(data.startsAt), "HH:mm")} (
          {data.service.durationMinutes} min)
        </p>

        <dl className="mt-6 space-y-3 border-t border-white/10 pt-6 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Nome</dt>
            <dd className="text-right font-medium text-zinc-100">{data.clientName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Telefone</dt>
            <dd className="text-right text-zinc-200">{data.clientPhone}</dd>
          </div>
          {data.unitName ? (
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Unidade</dt>
              <dd className="text-right text-zinc-200">{data.unitName}</dd>
            </div>
          ) : null}
          {data.staffDisplayName ? (
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Profissional</dt>
              <dd className="text-right text-zinc-200">{data.staffDisplayName}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Valor</dt>
            <dd className="text-right font-semibold text-brand-300">
              R$ {data.service.price.toFixed(2)}
            </dd>
          </div>
        </dl>

        {!data.canManage && data.manageBlockedReason ? (
          <p className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {data.manageBlockedReason}
          </p>
        ) : null}

        {data.canManage ? (
          <div className="mt-8 space-y-6 border-t border-white/10 pt-8">
            <div>
              <h2 className="font-display text-lg font-normal text-white">Remarcar</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Escolha outra data e horário livres para o mesmo serviço
                {data.staffDisplayName ? ` com ${data.staffDisplayName}` : ""}.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {dateRange.map((d) => {
                  const ymd = format(d, "yyyy-MM-dd");
                  const active = rescheduleDate === ymd;
                  return (
                    <button
                      key={ymd}
                      type="button"
                      onClick={() => setRescheduleDate(ymd)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-medium transition",
                        active
                          ? "border-brand-500/50 bg-brand-surface-20 text-brand-100"
                          : "border-white/10 text-zinc-400 hover:border-white/20",
                      )}
                    >
                      {format(d, "EEE dd/MM", { locale: ptBR })}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4">
                {loadingSlots ? (
                  <p className="text-sm text-zinc-500">Carregando horários…</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Nenhum horário disponível nesta data.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((t) => {
                      const active = selectedTime === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(t)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm transition",
                            active
                              ? "border-brand-500 bg-brand-surface-20 text-brand-100"
                              : "border-white/15 text-zinc-300 hover:border-white/30",
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={actionLoading || !selectedTime}
                onClick={() => void handleReschedule()}
                className="mt-4 w-full rounded-full bg-brand-500/90 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50"
              >
                Confirmar novo horário
              </button>
            </div>

            <div className="border-t border-white/10 pt-6">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleCancel()}
                className="w-full rounded-full border border-rose-500/40 py-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
              >
                Cancelar agendamento
              </button>
            </div>
          </div>
        ) : null}

        {actionMessage ? (
          <p
            className={cn(
              "mt-6 rounded-xl border px-4 py-3 text-sm",
              actionMessage.includes("sucesso") || actionMessage.includes("cancelado")
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-200",
            )}
          >
            {actionMessage}
          </p>
        ) : null}
      </motion.div>

      <p className="text-center text-xs text-zinc-500">
        Guarde este endereço — ele funciona como senha da reserva, sem precisar de cadastro.
        {manageUrl ? (
          <>
            <br />
            <button
              type="button"
              className="mt-2 text-brand-400 underline-offset-2 hover:underline"
              onClick={() => void navigator.clipboard.writeText(manageUrl)}
            >
              Copiar link
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}

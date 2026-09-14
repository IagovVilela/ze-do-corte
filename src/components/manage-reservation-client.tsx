"use client";

import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Star } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

type ManageBarber = {
  id: string;
  name: string;
  imageUrl: string | null;
};

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
  unitId: string | null;
  unitName: string | null;
  organizationSlug: string | null;
  organizationName: string | null;
  staffMemberId: string | null;
  staffDisplayName: string | null;
  barbers: ManageBarber[];
  canManage: boolean;
  manageBlockedReason: string | null;
  canReview: boolean;
  hasReview: boolean;
  reviewRating: number | null;
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
  /** "" = qualquer disponível; UUID = barbeiro escolhido. */
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

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
      setSelectedStaffId(payload.appointment.staffMemberId ?? "");
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
      selectedStaffId.length > 0
        ? `&staffMemberId=${encodeURIComponent(selectedStaffId)}`
        : "";
    const unitQ = data.unitId
      ? `&unitId=${encodeURIComponent(data.unitId)}`
      : "";
    const orgQ = data.organizationSlug
      ? `&organizationSlug=${encodeURIComponent(data.organizationSlug)}`
      : "";
    const durationQ = `&durationMinutes=${encodeURIComponent(String(data.service.durationMinutes))}`;

    const run = async () => {
      setLoadingSlots(true);
      setSelectedTime("");
      try {
        const res = await fetch(
          `/api/appointments/available?serviceId=${encodeURIComponent(data.service.id)}&date=${rescheduleDate}${staffQ}${unitQ}${orgQ}${durationQ}`,
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
  }, [
    data?.canManage,
    data?.service.id,
    data?.service.durationMinutes,
    data?.unitId,
    data?.organizationSlug,
    rescheduleDate,
    selectedStaffId,
  ]);

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
          staffMemberId: selectedStaffId.length > 0 ? selectedStaffId : null,
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

  async function handleReview() {
    if (!data?.canReview) return;
    setReviewSending(true);
    setReviewMessage(null);
    try {
      const res = await fetch("/api/marketplace/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manageToken: token,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        }),
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) {
        setReviewMessage(payload.message ?? "Não foi possível enviar a avaliação.");
        return;
      }
      setReviewMessage("Obrigado! Sua avaliação foi registrada.");
      await load();
    } catch {
      setReviewMessage("Erro de rede.");
    } finally {
      setReviewSending(false);
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

  const barbers = data.barbers ?? [];
  const selectedBarberName =
    selectedStaffId.length > 0
      ? (barbers.find((b) => b.id === selectedStaffId)?.name ??
        data.staffDisplayName)
      : null;

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
          <p className="mt-6 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
            {data.manageBlockedReason}
          </p>
        ) : null}

        {data.canManage ? (
          <div className="mt-8 space-y-6 border-t border-white/10 pt-8">
            <div>
              <h2 className="font-display text-lg font-normal text-white">Remarcar</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Escolha profissional, data e horário livres para o mesmo serviço.
              </p>

              {barbers.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <span className="text-sm font-medium text-zinc-200">
                      Profissional
                    </span>
                    <p className="mt-1 text-xs text-zinc-500">
                      Toque para trocar o barbeiro. A agenda será filtrada para ele.
                    </p>
                  </div>
                  <div
                    className="flex flex-wrap gap-2.5"
                    role="radiogroup"
                    aria-label="Escolher profissional"
                  >
                    <motion.button
                      type="button"
                      role="radio"
                      aria-checked={selectedStaffId === ""}
                      onClick={() => setSelectedStaffId("")}
                      whileTap={{ scale: 0.96 }}
                      className={cn(
                        "group relative flex w-[5.5rem] flex-col items-center gap-2 rounded-2xl border p-3 transition-all duration-200",
                        selectedStaffId === ""
                          ? "border-brand-500 bg-brand-surface-15 shadow-[0_0_24px_-6px_rgba(59,130,246,0.35)]"
                          : "border-white/10 bg-zinc-950/40 hover:border-zinc-500 hover:bg-zinc-900/50",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-14 items-center justify-center rounded-full border-2 transition-colors",
                          selectedStaffId === ""
                            ? "border-brand-500/60 bg-brand-surface-20 text-brand-300"
                            : "border-zinc-700 bg-zinc-800 text-zinc-500 group-hover:border-zinc-600",
                        )}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <span
                        className={cn(
                          "text-center text-[11px] font-medium leading-tight transition-colors",
                          selectedStaffId === "" ? "text-brand-200" : "text-zinc-400",
                        )}
                      >
                        Qualquer
                      </span>
                      {selectedStaffId === "" ? (
                        <motion.div
                          layoutId="manage-barber-check"
                          className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-brand-500 text-zinc-950 shadow-md"
                          transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </motion.div>
                      ) : null}
                    </motion.button>

                    {barbers.map((b) => {
                      const isSelected = selectedStaffId === b.id;
                      return (
                        <motion.button
                          key={b.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setSelectedStaffId(b.id)}
                          whileTap={{ scale: 0.96 }}
                          className={cn(
                            "group relative flex w-[5.5rem] flex-col items-center gap-2 rounded-2xl border p-3 transition-all duration-200",
                            isSelected
                              ? "border-brand-500 bg-brand-surface-15 shadow-[0_0_24px_-6px_rgba(59,130,246,0.35)]"
                              : "border-white/10 bg-zinc-950/40 hover:border-zinc-500 hover:bg-zinc-900/50",
                          )}
                        >
                          {b.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- URLs externas de perfil
                            <img
                              src={b.imageUrl}
                              alt={b.name}
                              className={cn(
                                "size-14 rounded-full border-2 object-cover transition-all",
                                isSelected
                                  ? "border-brand-500/60 shadow-md shadow-brand-500/20"
                                  : "border-zinc-700 group-hover:border-zinc-600",
                              )}
                            />
                          ) : (
                            <div
                              className={cn(
                                "flex size-14 items-center justify-center rounded-full border-2 text-lg font-bold transition-colors",
                                isSelected
                                  ? "border-brand-500/60 bg-brand-surface-20 text-brand-300"
                                  : "border-zinc-700 bg-zinc-800 text-zinc-500 group-hover:border-zinc-600",
                              )}
                            >
                              {b.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={cn(
                              "w-full truncate text-center text-[11px] font-medium leading-tight transition-colors",
                              isSelected ? "text-brand-200" : "text-zinc-400",
                            )}
                            title={b.name}
                          >
                            {b.name.split(" ")[0]}
                          </span>
                          {isSelected ? (
                            <motion.div
                              layoutId="manage-barber-check"
                              className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-brand-500 text-zinc-950 shadow-md"
                              transition={{ type: "spring", stiffness: 400, damping: 28 }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </motion.div>
                          ) : null}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

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
                    Nenhum horário disponível nesta data
                    {selectedBarberName ? ` com ${selectedBarberName}` : ""}.
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

        {data.hasReview ? (
          <div className="mt-8 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Você avaliou este atendimento com{" "}
            <strong>{data.reviewRating ?? "—"}</strong> estrela
            {(data.reviewRating ?? 0) === 1 ? "" : "s"}. Obrigado!
            {data.organizationSlug ? (
              <>
                {" "}
                <Link
                  href={`/${data.organizationSlug}`}
                  className="underline underline-offset-2 hover:text-white"
                >
                  Ver site da barbearia
                </Link>
              </>
            ) : null}
          </div>
        ) : null}

        {data.canReview ? (
          <div className="mt-8 space-y-4 border-t border-white/10 pt-8">
            <div>
              <h2 className="font-display text-lg font-normal text-white">
                Avalie este atendimento
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Sua nota aparece na busca Barbernegon
                {data.organizationName ? ` para ${data.organizationName}` : ""}.
              </p>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setReviewRating(n)}
                  className="rounded-lg p-1.5 transition hover:bg-white/5"
                  aria-label={`${n} estrela${n === 1 ? "" : "s"}`}
                >
                  <Star
                    className={cn(
                      "size-7",
                      n <= reviewRating
                        ? "fill-amber-300 text-amber-300"
                        : "text-zinc-600",
                    )}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Comentário opcional"
              className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/50"
            />
            <button
              type="button"
              disabled={reviewSending}
              onClick={() => void handleReview()}
              className="w-full rounded-full bg-amber-400/90 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50"
            >
              {reviewSending ? "Enviando…" : "Enviar avaliação"}
            </button>
            {reviewMessage ? (
              <p
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm",
                  reviewMessage.includes("Obrigado")
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-200",
                )}
              >
                {reviewMessage}
              </p>
            ) : null}
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

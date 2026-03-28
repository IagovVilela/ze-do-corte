"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { BUSINESS_HOURS } from "@/lib/constants";
import { formatBrPhoneNational } from "@/lib/br-phone-format";
import type { ServiceSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type AvailableApiResponse = {
  date: string;
  availableSlots: string[];
};

type BookingState = "idle" | "loading" | "success" | "error";

const visibleDates = Array.from({ length: 14 }).map((_, index) =>
  addDays(new Date(), index),
);

type BookingFormProps = {
  services: ServiceSummary[];
  barbers: { id: string; name: string }[];
};

export function BookingForm({ services, barbers }: BookingFormProps) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffMemberId, setStaffMemberId] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    format(visibleDates[0], "yyyy-MM-dd"),
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingState, setBookingState] = useState<BookingState>("idle");
  const [message, setMessage] = useState("");
  const [successManageToken, setSuccessManageToken] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId && services[0]) {
      setServiceId(services[0].id);
    }
  }, [serviceId, services]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [serviceId, services],
  );

  const selectedBarberName = useMemo(() => {
    if (!staffMemberId) return null;
    return barbers.find((b) => b.id === staffMemberId)?.name ?? null;
  }, [barbers, staffMemberId]);

  useEffect(() => {
    if (!serviceId || !selectedDate) return;

    const fetchAvailability = async () => {
      setLoadingSlots(true);
      setSelectedTime("");
      try {
        const staffQ =
          staffMemberId.length > 0
            ? `&staffMemberId=${encodeURIComponent(staffMemberId)}`
            : "";
        const response = await fetch(
          `/api/appointments/available?serviceId=${encodeURIComponent(serviceId)}&date=${selectedDate}${staffQ}`,
        );
        if (!response.ok) {
          throw new Error("Falha na disponibilidade");
        }
        const payload = (await response.json()) as AvailableApiResponse;
        setAvailableSlots(payload.availableSlots);
      } catch {
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    void fetchAvailability();
  }, [serviceId, selectedDate, staffMemberId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedService || !selectedTime) {
      setBookingState("error");
      setMessage("Selecione um serviço e um horário disponível.");
      return;
    }

    setBookingState("loading");
    setMessage("");
    setSuccessManageToken(null);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone: formatBrPhoneNational(customerPhone),
          customerEmail,
          notes,
          serviceId,
          date: selectedDate,
          time: selectedTime,
          ...(staffMemberId ? { staffMemberId } : {}),
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        appointment?: { clientManageToken?: string | null };
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "Não foi possível agendar.");
      }

      setBookingState("success");
      setMessage("Agendamento confirmado com sucesso.");
      setSuccessManageToken(
        payload.appointment?.clientManageToken?.trim() || null,
      );
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setNotes("");
      setSelectedTime("");

      const staffQ =
        staffMemberId.length > 0
          ? `&staffMemberId=${encodeURIComponent(staffMemberId)}`
          : "";
      const refresh = await fetch(
        `/api/appointments/available?serviceId=${encodeURIComponent(serviceId)}&date=${selectedDate}${staffQ}`,
      );
      const refreshed = (await refresh.json()) as AvailableApiResponse;
      setAvailableSlots(refreshed.availableSlots);
    } catch (error) {
      setBookingState("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-brand-500/70 focus:ring-2 focus:ring-brand-500/25";

  const noSlotsAvailable =
    !loadingSlots && availableSlots.length === 0 && serviceId && selectedDate;

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start">
      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        onSubmit={handleSubmit}
        className="glass-card min-w-0 max-w-full space-y-8 overflow-x-clip rounded-3xl p-4 shadow-lg shadow-black/20 sm:p-6 md:p-8"
      >
        <header className="border-b border-white/[0.06] pb-6">
          <h2 className="font-display text-2xl font-semibold tracking-wide text-white">
            Nova reserva
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Horários já ocupados aparecem indisponíveis. Altere a data ou o serviço se
            precisar de outra opção.
          </p>
        </header>

        <div className="space-y-6">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Serviço e horário
            </p>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-200">Serviço</span>
              <select
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                className={cn(
                  inputClass,
                  "min-w-0 max-w-full cursor-pointer truncate appearance-none bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-11",
                )}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                }}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id} className="bg-zinc-900">
                    {service.name} • R$ {service.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </label>

            {barbers.length > 0 ? (
              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium text-zinc-200">
                  Profissional (opcional)
                </span>
                <select
                  value={staffMemberId}
                  onChange={(event) => setStaffMemberId(event.target.value)}
                  className={cn(
                    inputClass,
                    "min-w-0 max-w-full cursor-pointer appearance-none bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-11",
                  )}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  }}
                >
                  <option value="" className="bg-zinc-900">
                    Qualquer disponível
                  </option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id} className="bg-zinc-900">
                      {b.name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-zinc-500">
                  Se escolher um nome, o horário respeita a agenda desse profissional e ele recebe um e-mail na confirmação.
                </span>
              </label>
            ) : null}
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm font-medium text-zinc-200">Data</p>
              <p className="text-[11px] text-zinc-500 lg:hidden">
                Deslize para os lados para ver mais dias
              </p>
            </div>
            <div
              className="-mx-3 flex snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain px-3 pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:-mx-0 sm:gap-2 sm:px-0"
              role="list"
              aria-label="Escolher data"
            >
              {visibleDates.map((date) => {
                const iso = format(date, "yyyy-MM-dd");
                const isActive = iso === selectedDate;
                return (
                  <motion.button
                    key={iso}
                    type="button"
                    role="listitem"
                    onClick={() => setSelectedDate(iso)}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "min-w-[4.75rem] max-w-[5.5rem] shrink-0 snap-start rounded-xl border px-2 py-2 text-left transition sm:min-w-[5.25rem] sm:max-w-none sm:px-3 sm:py-2.5",
                      isActive
                        ? "border-brand-500 bg-brand-500/20 text-brand-50 shadow-[0_0_20px_-8px_rgba(245,158,11,0.5)]"
                        : "border-white/10 bg-zinc-950/40 hover:border-zinc-500",
                    )}
                  >
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                      {format(date, "EEE", { locale: ptBR })}
                    </span>
                    <span className="text-sm font-semibold text-zinc-100">
                      {format(date, "dd/MM")}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-200">Horários disponíveis</p>
              {loadingSlots ? (
                <LoaderCircle className="size-4 shrink-0 animate-spin text-brand-400" />
              ) : null}
            </div>
            {noSlotsAvailable ? (
              <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
                Não há horários livres nesta data para o serviço escolhido. Tente outro dia
                ou outro serviço.
              </p>
            ) : null}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1.5 sm:gap-2">
              {BUSINESS_HOURS.map((time) => {
                const isAvailable = availableSlots.includes(time);
                const isSelected = selectedTime === time;
                return (
                  <motion.button
                    key={time}
                    type="button"
                    onClick={() => {
                      if (isAvailable) setSelectedTime(time);
                    }}
                    disabled={!isAvailable}
                    whileTap={isAvailable ? { scale: 0.95 } : undefined}
                    className={cn(
                      "min-w-0 rounded-lg border px-1.5 py-2 text-center text-xs font-medium transition sm:rounded-xl sm:px-2 sm:text-sm",
                      isSelected &&
                        "border-brand-500 bg-brand-500/20 text-brand-50 ring-1 ring-brand-500/30",
                      !isSelected && isAvailable && "border-white/10 bg-zinc-950/50 hover:border-zinc-500",
                      !isAvailable &&
                        "cursor-not-allowed border-zinc-800/80 bg-zinc-950/30 text-zinc-600 line-through decoration-zinc-600",
                    )}
                  >
                    {time}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Seus dados
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-200">Nome completo</span>
                <input
                  required
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className={inputClass}
                  placeholder="Seu nome"
                  autoComplete="name"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-200">Telefone</span>
                <input
                  required
                  type="tel"
                  value={customerPhone}
                  onChange={(event) =>
                    setCustomerPhone(formatBrPhoneNational(event.target.value))
                  }
                  maxLength={15}
                  className={cn(inputClass, "tabular-nums tracking-wide")}
                  placeholder="(12) 99999-9999"
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </label>
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium text-zinc-200">E-mail (opcional)</span>
              <input
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                className={inputClass}
                placeholder="voce@email.com"
                autoComplete="email"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-200">Observações (opcional)</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={cn(inputClass, "min-h-[88px] resize-y")}
              placeholder="Preferência de estilo, barba, alergias etc."
            />
          </label>
        </div>

        <motion.button
          type="submit"
          disabled={bookingState === "loading"}
          whileHover={{ scale: bookingState === "loading" ? 1 : 1.01 }}
          whileTap={{ scale: bookingState === "loading" ? 1 : 0.99 }}
          className="w-full rounded-full bg-brand-500 px-6 py-3.5 text-base font-bold text-zinc-950 shadow-lg shadow-brand-900/30 transition hover:brightness-110 disabled:opacity-70"
        >
          {bookingState === "loading" ? "Confirmando..." : "Confirmar agendamento"}
        </motion.button>
      </motion.form>

      <motion.aside
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
        className="glass-card h-fit min-w-0 max-w-full space-y-5 rounded-3xl p-4 shadow-lg shadow-black/20 sm:p-6 lg:sticky lg:top-24"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Resumo
          </p>
          <h3 className="font-display mt-1 text-xl font-semibold tracking-wide text-white">
            Sua reserva
          </h3>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-3">
            <dt className="text-zinc-500">Serviço</dt>
            <dd className="font-medium text-zinc-100">{selectedService?.name ?? "—"}</dd>
          </div>
          {barbers.length > 0 ? (
            <div className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-3">
              <dt className="text-zinc-500">Profissional</dt>
              <dd className="font-medium text-zinc-100">
                {selectedBarberName ?? (
                  <span className="font-normal text-zinc-500">Qualquer disponível</span>
                )}
              </dd>
            </div>
          ) : null}
          <div className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-3">
            <dt className="text-zinc-500">Data</dt>
            <dd className="font-medium text-zinc-100">
              {format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-3">
            <dt className="text-zinc-500">Horário</dt>
            <dd className="font-medium text-zinc-100">
              {selectedTime || (
                <span className="font-normal text-zinc-500">Selecione um horário</span>
              )}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2 pt-1">
            <dt className="text-zinc-500">Valor</dt>
            <dd className="text-lg font-semibold text-brand-300">
              {selectedService ? `R$ ${selectedService.price.toFixed(2)}` : "—"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-zinc-500">Duração</dt>
            <dd className="text-zinc-200">
              {selectedService ? `${selectedService.durationMinutes} min` : "—"}
            </dd>
          </div>
        </dl>

        <AnimatePresence mode="wait">
          {message ? (
            <motion.div
              key={bookingState + message.slice(0, 12)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              <p
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm",
                  bookingState === "success" &&
                    "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
                  bookingState === "error" &&
                    "border-rose-400/40 bg-rose-500/10 text-rose-300",
                )}
              >
                {message}
              </p>
              {bookingState === "success" && successManageToken ? (
                <div className="rounded-xl border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-sm text-brand-100">
                  <p className="font-medium text-brand-50">
                    Guarde o link para alterar ou cancelar depois (sem cadastro):
                  </p>
                  <Link
                    href={`/minha-reserva/${encodeURIComponent(successManageToken)}`}
                    className="mt-2 inline-block break-all text-xs text-brand-200 underline-offset-2 hover:underline"
                  >
                    Abrir página da minha reserva
                  </Link>
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.aside>
    </div>
  );
}

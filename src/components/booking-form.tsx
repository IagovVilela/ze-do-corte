"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { BUSINESS_HOURS } from "@/lib/constants";
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
};

export function BookingForm({ services }: BookingFormProps) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
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

  useEffect(() => {
    if (!serviceId && services[0]) {
      setServiceId(services[0].id);
    }
  }, [serviceId, services]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [serviceId, services],
  );

  useEffect(() => {
    if (!serviceId || !selectedDate) return;

    const fetchAvailability = async () => {
      setLoadingSlots(true);
      setSelectedTime("");
      try {
        const response = await fetch(
          `/api/appointments/available?serviceId=${serviceId}&date=${selectedDate}`,
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
  }, [serviceId, selectedDate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedService || !selectedTime) {
      setBookingState("error");
      setMessage("Selecione um serviço e um horário disponível.");
      return;
    }

    setBookingState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          notes,
          serviceId,
          date: selectedDate,
          time: selectedTime,
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Não foi possível agendar.");
      }

      setBookingState("success");
      setMessage("Agendamento confirmado com sucesso.");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setNotes("");
      setSelectedTime("");

      const refresh = await fetch(
        `/api/appointments/available?serviceId=${serviceId}&date=${selectedDate}`,
      );
      const refreshed = (await refresh.json()) as AvailableApiResponse;
      setAvailableSlots(refreshed.availableSlots);
    } catch (error) {
      setBookingState("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        onSubmit={handleSubmit}
        className="glass-card space-y-6 rounded-3xl p-6 md:p-8"
      >
        <div>
          <h2 className="text-2xl font-semibold">Agende em poucos cliques</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Escolha serviço, data e horário. O sistema bloqueia automaticamente
            horários já reservados.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Nome completo</span>
            <input
              required
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="w-full rounded-xl border bg-zinc-900/60 px-4 py-3 outline-none transition focus:border-brand-500"
              placeholder="Seu nome"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Telefone</span>
            <input
              required
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              className="w-full rounded-xl border bg-zinc-900/60 px-4 py-3 outline-none transition focus:border-brand-500"
              placeholder="(11) 99999-9999"
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">E-mail (opcional)</span>
          <input
            type="email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            className="w-full rounded-xl border bg-zinc-900/60 px-4 py-3 outline-none transition focus:border-brand-500"
            placeholder="voce@email.com"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Serviço</span>
          <select
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className="w-full rounded-xl border bg-zinc-900/60 px-4 py-3 outline-none transition focus:border-brand-500"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} • R$ {service.price.toFixed(2)}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-3">
          <p className="text-sm text-zinc-300">Data</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {visibleDates.map((date) => {
              const iso = format(date, "yyyy-MM-dd");
              const isActive = iso === selectedDate;
              return (
                <motion.button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(iso)}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    "min-w-[88px] rounded-xl border px-3 py-2 text-left transition",
                    isActive
                      ? "border-brand-500 bg-brand-500/20 text-brand-50"
                      : "bg-zinc-900/50 hover:border-zinc-500",
                  )}
                >
                  <span className="block text-xs uppercase text-zinc-400">
                    {format(date, "EEE", { locale: ptBR })}
                  </span>
                  <span className="text-sm font-semibold">{format(date, "dd/MM")}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-300">Horários disponíveis</p>
            {loadingSlots ? (
              <LoaderCircle className="size-4 animate-spin text-zinc-400" />
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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
                    "rounded-xl border px-3 py-2 text-sm transition",
                    isSelected && "border-brand-500 bg-brand-500/20",
                    !isSelected && isAvailable && "bg-zinc-900/40 hover:border-zinc-500",
                    !isAvailable &&
                      "cursor-not-allowed border-zinc-800 bg-zinc-900/20 text-zinc-600",
                  )}
                >
                  {time}
                </motion.button>
              );
            })}
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Observações</span>
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-xl border bg-zinc-900/60 px-4 py-3 outline-none transition focus:border-brand-500"
            placeholder="Preferência de estilo, barba etc."
          />
        </label>

        <motion.button
          type="submit"
          disabled={bookingState === "loading"}
          whileHover={{ scale: bookingState === "loading" ? 1 : 1.01 }}
          whileTap={{ scale: bookingState === "loading" ? 1 : 0.99 }}
          className="w-full rounded-full bg-brand-500 px-6 py-3 font-semibold text-zinc-950 transition hover:brightness-110 disabled:opacity-70"
        >
          {bookingState === "loading" ? "Confirmando..." : "Confirmar agendamento"}
        </motion.button>
      </motion.form>

      <motion.aside
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
        className="glass-card h-fit space-y-4 rounded-3xl p-6"
      >
        <h3 className="text-xl font-semibold">Resumo</h3>
        <div className="space-y-2 text-sm text-zinc-300">
          <p>
            <span className="text-zinc-500">Serviço:</span>{" "}
            {selectedService?.name ?? "—"}
          </p>
          <p>
            <span className="text-zinc-500">Data:</span>{" "}
            {format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}
          </p>
          <p>
            <span className="text-zinc-500">Horário:</span>{" "}
            {selectedTime || "Selecione um horário"}
          </p>
          <p>
            <span className="text-zinc-500">Valor:</span>{" "}
            {selectedService ? `R$ ${selectedService.price.toFixed(2)}` : "—"}
          </p>
          <p>
            <span className="text-zinc-500">Duração:</span>{" "}
            {selectedService ? `${selectedService.durationMinutes} min` : "—"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {message ? (
            <motion.p
              key={bookingState + message.slice(0, 12)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                bookingState === "success" &&
                  "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
                bookingState === "error" &&
                  "border-rose-400/40 bg-rose-500/10 text-rose-300",
              )}
            >
              {message}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </motion.aside>
    </div>
  );
}

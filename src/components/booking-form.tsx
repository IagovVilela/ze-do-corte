"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { LoaderCircle, Copy, Check, Flame } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import posthog from "posthog-js";

import { AppointmentPixPay } from "@/components/appointment-pix-pay";
import { ClearableSearchInput } from "@/components/ui/clearable-search-input";
import { BUSINESS_HOURS } from "@/lib/constants";
import { formatBrPhoneNational } from "@/lib/br-input-masks";
import type { ServiceSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type AvailableApiResponse = {
  date: string;
  availableSlots: string[];
  durationMinutes?: number;
  slotEndsAt?: Record<string, string>;
};

type BookingState = "idle" | "loading" | "success" | "error";

type HistorySuggestion = {
  serviceId: string;
  name: string;
  lastAt: string;
  count: number;
};

type ServiceCategoryFilter =
  | "ALL"
  | "CORTE"
  | "BARBA"
  | "COMBO"
  | "TRATAMENTO"
  | "OUTRO";

const CATEGORY_LABELS: Record<Exclude<ServiceCategoryFilter, "ALL">, string> = {
  CORTE: "Corte",
  BARBA: "Barba",
  COMBO: "Combo",
  TRATAMENTO: "Tratamento",
  OUTRO: "Outros",
};

/** Dias sem o serviço para considerar “faz algum tempo” (estilo Cash Barber). */
const MISS_YOU_AFTER_DAYS = 21;

const visibleDates = Array.from({ length: 14 }).map((_, index) =>
  addDays(new Date(), index),
);

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function serviceMatchesQuery(
  service: ServiceSummary & { price: number; durationMinutes: number },
  query: string,
): boolean {
  if (!query) return true;
  const hay = normalizeSearch(
    `${service.name} ${service.description} ${service.category ?? ""} ${CATEGORY_LABELS[service.category ?? "OUTRO"] ?? ""}`,
  );
  return query.split(/\s+/).every((token) => hay.includes(token));
}

type BookingFormProps = {
  services: ServiceSummary[];
  barbers: { id: string; name: string; imageUrl: string | null; unitId: string | null }[];
  units: { id: string; name: string; isDefault: boolean }[];
  organizationSlug: string;
  /** Mais pedidos da unidade padrão (SSR); atualiza ao trocar filial. */
  popularServiceIds?: string[];
};

export function BookingForm({
  services,
  barbers,
  units,
  organizationSlug,
  popularServiceIds: initialPopularIds = [],
}: BookingFormProps) {
  const defaultUnitId = units.find((u) => u.isDefault)?.id ?? units[0]?.id ?? "";
  const [unitId, setUnitId] = useState(defaultUnitId);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<ServiceCategoryFilter>("ALL");
  const [popularServiceIds, setPopularServiceIds] =
    useState<string[]>(initialPopularIds);
  const [historySuggestions, setHistorySuggestions] = useState<
    HistorySuggestion[]
  >([]);
  const dismissedMissYouRef = useRef<string>("");
  const [missYouOpen, setMissYouOpen] = useState(false);

  const [staffMemberId, setStaffMemberId] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    format(visibleDates[0], "yyyy-MM-dd"),
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotEndsAt, setSlotEndsAt] = useState<Record<string, string>>({});
  const [serverDurationMinutes, setServerDurationMinutes] = useState<
    number | null
  >(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingState, setBookingState] = useState<BookingState>("idle");
  const [message, setMessage] = useState("");
  const [successManageToken, setSuccessManageToken] = useState<string | null>(null);
  const [successAppointmentId, setSuccessAppointmentId] = useState<string | null>(
    null,
  );
  const [successUsedClub, setSuccessUsedClub] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [clubBadge, setClubBadge] = useState<string | null>(null);

  const filteredBarbers = useMemo(
    () => barbers.filter((b) => !b.unitId || b.unitId === unitId),
    [barbers, unitId]
  );

  const filteredServices = useMemo(() => {
    return services
      .filter((service) => {
        if (service.unitId === unitId) return true;
        return Boolean(
          service.unitOverrides?.some((o) => o.unitId === unitId),
        );
      })
      .map((service) => {
        const override = service.unitOverrides?.find((o) => o.unitId === unitId);
        return {
          ...service,
          isActive: override ? override.isActive : service.isActive,
          price: override?.price != null ? override.price : service.price,
          durationMinutes:
            override?.durationMinutes != null
              ? override.durationMinutes
              : service.durationMinutes,
        };
      })
      .filter((s) => s.isActive);
  }, [services, unitId]);

  useEffect(() => {
    setServiceQuery("");
    setCategoryFilter("ALL");
  }, [unitId]);

  useEffect(() => {
    let cancelled = false;
    async function loadPopular() {
      try {
        const qs = new URLSearchParams({
          organizationSlug,
        });
        if (unitId) qs.set("unitId", unitId);
        const res = await fetch(
          `/api/appointments/popular-services?${qs.toString()}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { serviceIds?: string[] };
        if (!cancelled) setPopularServiceIds(data.serviceIds ?? []);
      } catch {
        /* mantém ranking SSR */
      }
    }
    void loadPopular();
    return () => {
      cancelled = true;
    };
  }, [organizationSlug, unitId]);

  useEffect(() => {
    if (filteredServices.length === 0) {
      setSelectedServiceIds([]);
      return;
    }
    setSelectedServiceIds((prev) => {
      const kept = prev.filter((id) =>
        filteredServices.some((s) => s.id === id),
      );
      if (kept.length > 0) return kept;
      return [filteredServices[0]!.id];
    });
  }, [filteredServices]);

  const normalizedQuery = useMemo(
    () => normalizeSearch(serviceQuery),
    [serviceQuery],
  );

  const isFiltering = normalizedQuery.length > 0 || categoryFilter !== "ALL";

  const availableCategories = useMemo(() => {
    const present = new Set(
      filteredServices.map((s) => s.category ?? "OUTRO"),
    );
    return (
      Object.keys(CATEGORY_LABELS) as Exclude<ServiceCategoryFilter, "ALL">[]
    ).filter((c) => present.has(c));
  }, [filteredServices]);

  const matchedServices = useMemo(() => {
    return filteredServices.filter((s) => {
      if (categoryFilter !== "ALL" && (s.category ?? "OUTRO") !== categoryFilter) {
        return false;
      }
      return serviceMatchesQuery(s, normalizedQuery);
    });
  }, [filteredServices, categoryFilter, normalizedQuery]);

  const popularServices = useMemo(() => {
    if (isFiltering) return [];
    const byId = new Map(filteredServices.map((s) => [s.id, s]));
    return popularServiceIds
      .map((id) => byId.get(id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .slice(0, 5);
  }, [popularServiceIds, filteredServices, isFiltering]);

  const otherServices = useMemo(() => {
    if (isFiltering) return matchedServices;
    const popularSet = new Set(popularServices.map((s) => s.id));
    return matchedServices.filter((s) => !popularSet.has(s.id));
  }, [isFiltering, matchedServices, popularServices]);

  const selectedServices = useMemo(
    () =>
      selectedServiceIds
        .map((id) => filteredServices.find((s) => s.id === id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    [selectedServiceIds, filteredServices],
  );

  const serviceId = selectedServices[0]?.id ?? "";
  const extraServiceIds = selectedServices.slice(1).map((s) => s.id);

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0),
    [selectedServices],
  );

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.price, 0),
    [selectedServices],
  );

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 9) return prev;
      return [...prev, id];
    });
    setSelectedTime("");
  }

  const missYouCandidates = useMemo(() => {
    const today = new Date();
    return historySuggestions.filter((s) => {
      if (selectedServiceIds.includes(s.serviceId)) return false;
      if (!filteredServices.some((fs) => fs.id === s.serviceId)) return false;
      const last = parseISO(s.lastAt);
      if (Number.isNaN(last.getTime())) return false;
      return differenceInCalendarDays(today, last) >= MISS_YOU_AFTER_DAYS;
    });
  }, [historySuggestions, selectedServiceIds, filteredServices]);

  useEffect(() => {
    const digits = customerPhone.replace(/\D/g, "");
    if (digits.length < 10 || missYouCandidates.length === 0) {
      setMissYouOpen(false);
      return;
    }
    const key = `${formatBrPhoneNational(customerPhone)}:${missYouCandidates
      .map((c) => c.serviceId)
      .sort()
      .join(",")}`;
    if (dismissedMissYouRef.current === key) return;
    setMissYouOpen(true);
  }, [customerPhone, missYouCandidates]);

  function acceptMissYou() {
    setSelectedServiceIds((prev) => {
      const next = [...prev];
      for (const c of missYouCandidates) {
        if (!next.includes(c.serviceId) && next.length < 9) {
          next.push(c.serviceId);
        }
      }
      return next;
    });
    setSelectedTime("");
    const key = `${formatBrPhoneNational(customerPhone)}:${missYouCandidates
      .map((c) => c.serviceId)
      .sort()
      .join(",")}`;
    dismissedMissYouRef.current = key;
    setMissYouOpen(false);
  }

  function declineMissYou() {
    const key = `${formatBrPhoneNational(customerPhone)}:${missYouCandidates
      .map((c) => c.serviceId)
      .sort()
      .join(",")}`;
    dismissedMissYouRef.current = key;
    setMissYouOpen(false);
  }

  const selectedBarberName = useMemo(() => {
    if (!staffMemberId) return null;
    return barbers.find((b) => b.id === staffMemberId)?.name ?? null;
  }, [barbers, staffMemberId]);

  useEffect(() => {
    const digits = customerPhone.replace(/\D/g, "");
    if (digits.length < 10 || !organizationSlug) {
      setHistorySuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      void (async () => {
        try {
          const qs = new URLSearchParams({
            organizationSlug,
            phone: formatBrPhoneNational(customerPhone),
          });
          if (unitId) qs.set("unitId", unitId);
          const res = await fetch(
            `/api/appointments/client-history?${qs.toString()}`,
          );
          if (!res.ok) return;
          const data = (await res.json()) as {
            suggestions?: {
              serviceId: string;
              name: string;
              lastAt: string;
              count: number;
            }[];
          };
          setHistorySuggestions(data.suggestions ?? []);
        } catch {
          setHistorySuggestions([]);
        }
      })();
    }, 450);
    return () => clearTimeout(t);
  }, [customerPhone, organizationSlug, unitId]);

  useEffect(() => {
    const digits = customerPhone.replace(/\D/g, "");
    if (digits.length < 10 || !organizationSlug) {
      setClubBadge(null);
      return;
    }
    const t = setTimeout(() => {
      void (async () => {
        try {
          const qs = new URLSearchParams({
            organizationSlug,
            phone: formatBrPhoneNational(customerPhone),
          });
          const res = await fetch(`/api/public/club-status?${qs.toString()}`);
          if (!res.ok) {
            setClubBadge(null);
            return;
          }
          const data = (await res.json()) as {
            club?: { badgeLabel?: string } | null;
          };
          setClubBadge(data.club?.badgeLabel ?? null);
        } catch {
          setClubBadge(null);
        }
      })();
    }, 450);
    return () => clearTimeout(t);
  }, [customerPhone, organizationSlug]);

  useEffect(() => {
    if (!serviceId || !selectedDate || !unitId) return;

    const fetchAvailability = async () => {
      setLoadingSlots(true);
      setSelectedTime("");
      try {
        const staffQ =
          staffMemberId.length > 0
            ? `&staffMemberId=${encodeURIComponent(staffMemberId)}`
            : "";
        const idsQ = encodeURIComponent(selectedServiceIds.join(","));
        const response = await fetch(
          `/api/appointments/available?serviceIds=${idsQ}&serviceId=${encodeURIComponent(serviceId)}&date=${selectedDate}&unitId=${encodeURIComponent(unitId)}&organizationSlug=${encodeURIComponent(organizationSlug)}${staffQ}`,
        );
        if (!response.ok) {
          throw new Error("Falha na disponibilidade");
        }
        const payload = (await response.json()) as AvailableApiResponse;
        setAvailableSlots(payload.availableSlots);
        setSlotEndsAt(payload.slotEndsAt ?? {});
        setServerDurationMinutes(
          typeof payload.durationMinutes === "number"
            ? payload.durationMinutes
            : totalDuration,
        );
      } catch {
        setAvailableSlots([]);
        setSlotEndsAt({});
        setServerDurationMinutes(null);
      } finally {
        setLoadingSlots(false);
      }
    };

    void fetchAvailability();
  }, [
    serviceId,
    selectedServiceIds,
    selectedDate,
    staffMemberId,
    unitId,
    organizationSlug,
    totalDuration,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedServices.length === 0 || !selectedTime) {
      setBookingState("error");
      setMessage("Selecione ao menos um serviço e um horário disponível.");
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
          extraServiceIds,
          date: selectedDate,
          time: selectedTime,
          unitId: unitId,
          organizationSlug,
          ...(staffMemberId ? { staffMemberId } : {}),
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        appointment?: {
          id?: string;
          clientManageToken?: string | null;
          usedSubscriptionId?: string | null;
        };
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "Não foi possível agendar.");
      }

      setBookingState("success");
      setMessage("Agendamento confirmado com sucesso.");

      posthog.capture("appointment_submitted", {
        organization_slug: organizationSlug,
        unit_id: unitId,
        service_id: serviceId,
        extra_service_count: extraServiceIds.length,
        used_club: Boolean(payload.appointment?.usedSubscriptionId),
        appointment_id: payload.appointment?.id ?? null,
      });

      setSuccessManageToken(
        payload.appointment?.clientManageToken?.trim() || null,
      );
      setSuccessAppointmentId(payload.appointment?.id ?? null);
      setSuccessUsedClub(Boolean(payload.appointment?.usedSubscriptionId));
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setNotes("");
      setSelectedTime("");

      const staffQ =
        staffMemberId.length > 0
          ? `&staffMemberId=${encodeURIComponent(staffMemberId)}`
          : "";
      const idsQ = encodeURIComponent(selectedServiceIds.join(","));
      const refresh = await fetch(
        `/api/appointments/available?serviceIds=${idsQ}&serviceId=${encodeURIComponent(serviceId)}&date=${selectedDate}&unitId=${encodeURIComponent(unitId)}&organizationSlug=${encodeURIComponent(organizationSlug)}${staffQ}`,
      );
      const refreshed = (await refresh.json()) as AvailableApiResponse;
      setAvailableSlots(refreshed.availableSlots);
      setSlotEndsAt(refreshed.slotEndsAt ?? {});
      if (typeof refreshed.durationMinutes === "number") {
        setServerDurationMinutes(refreshed.durationMinutes);
      }
    } catch (error) {
      setBookingState("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
      posthog.captureException(error);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-brand-500/70 focus:ring-2 focus:ring-brand-500/25";

  const noSlotsAvailable =
    !loadingSlots && availableSlots.length === 0 && serviceId && selectedDate;

  const effectiveDuration = serverDurationMinutes ?? totalDuration;
  const selectedEndsAt =
    selectedTime && slotEndsAt[selectedTime]
      ? slotEndsAt[selectedTime]
      : null;

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start">
      <AnimatePresence>
        {missYouOpen && missYouCandidates.length > 0 ? (
          <motion.div
            key="miss-you"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="miss-you-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="w-full max-w-sm rounded-2xl bg-zinc-100 p-6 text-center shadow-2xl"
            >
              <div className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-amber-500/80 text-2xl font-bold text-amber-600">
                !
              </div>
              <h3
                id="miss-you-title"
                className="mt-4 text-xl font-bold text-zinc-900"
              >
                Sentimos sua falta!
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                Você realizou os serviços:{" "}
                <strong className="text-zinc-800">
                  {missYouCandidates.map((c) => c.name).join(", ")}
                </strong>{" "}
                já faz algum tempo, deseja adicioná-los ao seu agendamento?
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={acceptMissYou}
                  className="rounded-xl bg-amber-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={declineMissYou}
                  className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
                >
                  Não
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
            Escolha um ou mais serviços na mesma visita. Horários ocupados ficam
            indisponíveis conforme a duração total.
          </p>
        </header>

        <div className="space-y-6">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Unidade, serviços e horário
            </p>
            {units.length > 1 ? (
              <label className="mb-4 block space-y-2">
                <span className="text-sm font-medium text-zinc-200">Unidade</span>
                <select
                  value={unitId}
                  onChange={(event) => {
                    setUnitId(event.target.value);
                    setStaffMemberId("");
                    setSelectedTime("");
                  }}
                  className={cn(
                    inputClass,
                    "min-w-0 max-w-full cursor-pointer truncate appearance-none bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-11",
                  )}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  }}
                >
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id} className="bg-zinc-900">
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    Selecione os serviços
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Busque, filtre por tipo ou escolha os mais pedidos — duração e
                    valor somam na comanda.
                  </p>
                </div>
                {selectedServices.length > 0 ? (
                  <p className="shrink-0 text-xs tabular-nums text-brand-300">
                    {selectedServices.length} · R$ {totalPrice.toFixed(2)}
                  </p>
                ) : null}
              </div>

              {filteredServices.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-400">
                  Nenhum serviço cadastrado nesta unidade.
                </p>
              ) : (
                <>
                  <label className="block">
                    <ClearableSearchInput
                      value={serviceQuery}
                      onChange={setServiceQuery}
                      withSearchIcon
                      searchIconClassName="text-zinc-500"
                      placeholder="Buscar serviço (ex.: barba, corte…)"
                      className={cn(inputClass, "pr-3")}
                      aria-label="Buscar serviços"
                    />
                  </label>

                  {availableCategories.length > 1 ? (
                    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
                      <button
                        type="button"
                        onClick={() => setCategoryFilter("ALL")}
                        className={cn(
                          "min-h-9 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                          categoryFilter === "ALL"
                            ? "bg-brand-500 text-zinc-950"
                            : "border border-white/10 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200",
                        )}
                      >
                        Todos
                      </button>
                      {availableCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategoryFilter(cat)}
                          className={cn(
                            "min-h-9 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                            categoryFilter === cat
                              ? "bg-brand-500 text-zinc-950"
                              : "border border-white/10 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200",
                          )}
                        >
                          {CATEGORY_LABELS[cat]}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="max-h-[26rem] space-y-4 overflow-y-auto overscroll-contain pr-1">
                    {!isFiltering && popularServices.length > 0 ? (
                      <div className="space-y-2">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] text-brand-300 uppercase">
                          <Flame className="size-3.5" aria-hidden />
                          Mais pedidos
                        </p>
                        <ul className="space-y-2">
                          {popularServices.map((service) => (
                            <li key={`pop-${service.id}`}>
                              <ServicePickRow
                                service={service}
                                checked={selectedServiceIds.includes(service.id)}
                                popular
                                onToggle={() => toggleService(service.id)}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      {!isFiltering && popularServices.length > 0 ? (
                        <p className="text-[11px] font-bold tracking-[0.12em] text-zinc-500 uppercase">
                          Todos os serviços
                        </p>
                      ) : isFiltering ? (
                        <p className="text-xs text-zinc-500">
                          {matchedServices.length === 0
                            ? "Nenhum serviço encontrado."
                            : `${matchedServices.length} resultado${matchedServices.length === 1 ? "" : "s"}`}
                        </p>
                      ) : null}
                      {otherServices.length > 0 ? (
                        <ul className="space-y-2">
                          {otherServices.map((service) => (
                            <li key={service.id}>
                              <ServicePickRow
                                service={service}
                                checked={selectedServiceIds.includes(service.id)}
                                onToggle={() => toggleService(service.id)}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>

            {filteredBarbers.length > 0 ? (
              <div className="mt-4 space-y-3">
                <div>
                  <span className="text-sm font-medium text-zinc-200">
                    Profissional (opcional)
                  </span>
                  <p className="mt-1 text-xs text-zinc-500">
                    Toque no profissional desejado. A agenda será filtrada para ele.
                  </p>
                </div>
                <div
                  className="flex flex-wrap gap-2.5"
                  role="radiogroup"
                  aria-label="Escolher profissional"
                >
                  {/* Opção "qualquer disponível" */}
                  <motion.button
                    type="button"
                    role="radio"
                    aria-checked={staffMemberId === ""}
                    onClick={() => setStaffMemberId("")}
                    whileTap={{ scale: 0.96 }}
                    className={cn(
                      "group relative flex w-[5.5rem] flex-col items-center gap-2 rounded-2xl border p-3 transition-all duration-200",
                      staffMemberId === ""
                        ? "border-brand-500 bg-brand-surface-15 shadow-[0_0_24px_-6px_rgba(59, 130, 246,0.35)]"
                        : "border-white/10 bg-zinc-950/40 hover:border-zinc-500 hover:bg-zinc-900/50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-14 items-center justify-center rounded-full border-2 transition-colors",
                        staffMemberId === ""
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
                        staffMemberId === "" ? "text-brand-200" : "text-zinc-400",
                      )}
                    >
                      Qualquer
                    </span>
                    {staffMemberId === "" && (
                      <motion.div
                        layoutId="barber-check"
                        className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-brand-500 text-zinc-950 shadow-md"
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.button>

                  {/* Cards dos barbeiros */}
                  {filteredBarbers.map((b) => {
                    const isSelected = staffMemberId === b.id;
                    return (
                      <motion.button
                        key={b.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setStaffMemberId(b.id)}
                        whileTap={{ scale: 0.96 }}
                        className={cn(
                          "group relative flex w-[5.5rem] flex-col items-center gap-2 rounded-2xl border p-3 transition-all duration-200",
                          isSelected
                            ? "border-brand-500 bg-brand-surface-15 shadow-[0_0_24px_-6px_rgba(59, 130, 246,0.35)]"
                            : "border-white/10 bg-zinc-950/40 hover:border-zinc-500 hover:bg-zinc-900/50",
                        )}
                      >
                        {b.imageUrl ? (
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
                        {isSelected && (
                          <motion.div
                            layoutId="barber-check"
                            className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-brand-500 text-zinc-950 shadow-md"
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
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
                        ? "border-brand-500 bg-brand-surface-20 text-brand-50 shadow-[0_0_20px_-8px_rgba(59, 130, 246,0.5)]"
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  Horários disponíveis
                </p>
                {effectiveDuration > 0 ? (
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Bloco contínuo de {effectiveDuration} min
                    {selectedEndsAt
                      ? ` · termina às ${selectedEndsAt}`
                      : " · só entram horários que cabem inteiros"}
                  </p>
                ) : null}
              </div>
              {loadingSlots ? (
                <LoaderCircle className="size-4 shrink-0 animate-spin text-brand-400" />
              ) : null}
            </div>
            {noSlotsAvailable ? (
              <p className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-200/90">
                Nenhum horário comporta os {effectiveDuration || "seus"} minutos
                de atendimento nesta data
                {staffMemberId ? " com este profissional" : ""}. Tente outro dia,
                menos serviços ou outro barbeiro.
              </p>
            ) : null}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1.5 sm:gap-2">
              {BUSINESS_HOURS.map((time) => {
                const isAvailable = availableSlots.includes(time);
                const isSelected = selectedTime === time;
                const ends = slotEndsAt[time];
                return (
                  <motion.button
                    key={time}
                    type="button"
                    title={
                      isAvailable && ends
                        ? `${time}–${ends} (${effectiveDuration} min)`
                        : undefined
                    }
                    onClick={() => {
                      if (isAvailable) setSelectedTime(time);
                    }}
                    disabled={!isAvailable}
                    whileTap={isAvailable ? { scale: 0.95 } : undefined}
                    className={cn(
                      "min-w-0 rounded-lg border px-1.5 py-2 text-center text-xs font-medium transition sm:rounded-xl sm:px-2 sm:text-sm",
                      isSelected &&
                        "border-brand-500 bg-brand-surface-20 text-brand-50 ring-1 ring-brand-500/30",
                      !isSelected &&
                        isAvailable &&
                        "border-white/10 bg-zinc-950/50 hover:border-zinc-500",
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
                {clubBadge ? (
                  <span className="mt-2 inline-flex rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-200">
                    {clubBadge}
                  </span>
                ) : null}
              </label>
            </div>

            {historySuggestions.filter(
              (s) =>
                !selectedServiceIds.includes(s.serviceId) &&
                filteredServices.some((fs) => fs.id === s.serviceId) &&
                differenceInCalendarDays(new Date(), parseISO(s.lastAt)) <
                  MISS_YOU_AFTER_DAYS,
            ).length > 0 ? (
              <div className="mt-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
                <p className="text-sm font-semibold text-sky-100">
                  Serviços recentes no seu histórico
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {historySuggestions
                    .filter(
                      (s) =>
                        !selectedServiceIds.includes(s.serviceId) &&
                        filteredServices.some((fs) => fs.id === s.serviceId) &&
                        differenceInCalendarDays(
                          new Date(),
                          parseISO(s.lastAt),
                        ) < MISS_YOU_AFTER_DAYS,
                    )
                    .slice(0, 5)
                    .map((s) => (
                      <li key={s.serviceId}>
                        <button
                          type="button"
                          onClick={() => toggleService(s.serviceId)}
                          className="rounded-full border border-sky-400/40 bg-sky-950/40 px-3 py-1.5 text-left text-xs text-sky-50 transition hover:bg-sky-800/50"
                        >
                          <span className="font-semibold">{s.name}</span>
                          <span className="mt-0.5 block text-[10px] text-sky-200/80">
                            Última vez em{" "}
                            {format(parseISO(s.lastAt), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}

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
            <dt className="text-zinc-500">
              Serviço{selectedServices.length > 1 ? "s" : ""}
            </dt>
            <dd className="font-medium text-zinc-100">
              {selectedServices.length > 0
                ? selectedServices.map((s) => s.name).join(", ")
                : "—"}
            </dd>
          </div>
          {units.length > 1 ? (
            <div className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-3">
              <dt className="text-zinc-500">Unidade</dt>
              <dd className="font-medium text-zinc-100">
                {units.find((u) => u.id === unitId)?.name ?? "—"}
              </dd>
            </div>
          ) : null}
          {filteredBarbers.length > 0 ? (
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
              {selectedServices.length > 0
                ? `R$ ${totalPrice.toFixed(2)}`
                : "—"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-zinc-500">Duração</dt>
            <dd className="text-zinc-200">
              {selectedServices.length > 0 ? `${totalDuration} min` : "—"}
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
                <div className="rounded-xl border border-brand-500/25 bg-brand-surface-10 px-4 py-3 text-sm text-brand-100">
                  <p className="font-medium text-brand-50">
                    Guarde o link para alterar ou cancelar depois (sem cadastro):
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Link
                      href={`/minha-reserva/${encodeURIComponent(successManageToken)}`}
                      className="inline-block break-all text-xs font-medium text-brand-400 underline-offset-2 hover:underline"
                    >
                      Abrir página da minha reserva
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        const url = new URL(
                          `/minha-reserva/${encodeURIComponent(successManageToken)}`,
                          window.location.origin
                        ).toString();
                        navigator.clipboard.writeText(url);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-400/30 bg-brand-500/10 px-2.5 py-1.5 text-xs font-semibold text-brand-300 transition-colors hover:bg-brand-500/20 active:bg-brand-500/30"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="size-3.5" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          Copiar link
                        </>
                      )}
                    </button>
                  </div>
                  {successAppointmentId ? (
                    <AppointmentPixPay
                      appointmentId={successAppointmentId}
                      manageToken={successManageToken}
                      usedClub={successUsedClub}
                    />
                  ) : null}
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.aside>
    </div>
  );
}

function ServicePickRow({
  service,
  checked,
  popular,
  onToggle,
}: {
  service: {
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
  };
  checked: boolean;
  popular?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
        checked
          ? "border-brand-500/50 bg-brand-500/10 ring-1 ring-brand-500/30"
          : "border-white/10 bg-zinc-950/40 hover:border-white/20 hover:bg-zinc-900/50",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-zinc-100">{service.name}</span>
          {popular ? (
            <span className="rounded-md bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand-300 uppercase">
              Popular
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-sm text-zinc-400">
          R$ {service.price.toFixed(2)}
          <span className="text-zinc-600"> · </span>
          {service.durationMinutes} min
        </span>
      </span>
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition",
          checked
            ? "border-brand-400 bg-brand-500 text-zinc-950"
            : "border-zinc-500 bg-transparent",
        )}
        aria-hidden
      >
        {checked ? <Check className="size-3.5 stroke-[3]" /> : null}
      </span>
    </button>
  );
}

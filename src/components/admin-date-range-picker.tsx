"use client";

import { createPortal } from "react-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type DateRangeYmd = { from: string; to: string };

type PresetId =
  | "today"
  | "yesterday"
  | "last3"
  | "last7"
  | "last15"
  | "last30";

const PRESETS: { id: PresetId; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "last3", label: "Últimos 3 dias" },
  { id: "last7", label: "Últimos 7 dias" },
  { id: "last15", label: "Últimos 15 dias" },
  { id: "last30", label: "Últimos 30 dias" },
];

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

function toYmd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function parseYmd(s: string): Date {
  return parseISO(`${s}T12:00:00`);
}

export function rangeFromPreset(id: PresetId, today = new Date()): DateRangeYmd {
  const end = today;
  switch (id) {
    case "today":
      return { from: toYmd(end), to: toYmd(end) };
    case "yesterday": {
      const y = subDays(end, 1);
      return { from: toYmd(y), to: toYmd(y) };
    }
    case "last3":
      return { from: toYmd(subDays(end, 2)), to: toYmd(end) };
    case "last7":
      return { from: toYmd(subDays(end, 6)), to: toYmd(end) };
    case "last15":
      return { from: toYmd(subDays(end, 14)), to: toYmd(end) };
    case "last30":
      return { from: toYmd(subDays(end, 29)), to: toYmd(end) };
    default: {
      const _n: never = id;
      return _n;
    }
  }
}

function detectPreset(range: DateRangeYmd, today = new Date()): PresetId | null {
  for (const p of PRESETS) {
    const r = rangeFromPreset(p.id, today);
    if (r.from === range.from && r.to === range.to) return p.id;
  }
  return null;
}

function formatTriggerLabel(range: DateRangeYmd): string {
  const preset = detectPreset(range);
  if (preset) {
    return PRESETS.find((p) => p.id === preset)!.label;
  }
  const a = parseYmd(range.from);
  const b = parseYmd(range.to);
  if (range.from === range.to) {
    return format(a, "dd MMM yyyy", { locale: ptBR });
  }
  return `${format(a, "dd MMM", { locale: ptBR })} – ${format(b, "dd MMM yyyy", { locale: ptBR })}`;
}

type Props = {
  value: DateRangeYmd;
  onChange: (next: DateRangeYmd) => void;
  className?: string;
};

export function AdminDateRangePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(parseYmd(value.to)));
  const [draft, setDraft] = useState<DateRangeYmd>(value);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setDraft(value);
      setMonth(startOfMonth(parseYmd(value.to)));
      setPickingEnd(false);
    }
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: Math.min(rect.left, window.innerWidth - 460),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activePreset = detectPreset(draft);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  function applyPreset(id: PresetId) {
    const next = rangeFromPreset(id);
    setDraft(next);
    onChange(next);
    setOpen(false);
  }

  function applyDraft() {
    const from = draft.from <= draft.to ? draft.from : draft.to;
    const to = draft.from <= draft.to ? draft.to : draft.from;
    onChange({ from, to });
    setOpen(false);
  }

  function onDayClick(day: Date) {
    const ymd = toYmd(day);
    if (!pickingEnd) {
      setDraft({ from: ymd, to: ymd });
      setPickingEnd(true);
      return;
    }
    let from = draft.from;
    let to = ymd;
    if (isBefore(parseYmd(to), parseYmd(from))) {
      [from, to] = [to, from];
    }
    setDraft({ from, to });
    setPickingEnd(false);
  }

  function dayState(day: Date) {
    const from = parseYmd(draft.from);
    const to = parseYmd(draft.to);
    const start = isSameDay(day, from);
    const end = isSameDay(day, to);
    const inRange =
      (isAfter(day, from) || isSameDay(day, from)) &&
      (isBefore(day, to) || isSameDay(day, to));
    const outside = !isSameMonth(day, month);
    return { start, end, inRange, outside };
  }

  const panel = open && mounted ? (
    <div
      ref={panelRef}
      id={listId}
      role="dialog"
      aria-label="Escolher período"
      className="fixed z-[400] flex overflow-hidden rounded-2xl border border-zinc-700 shadow-2xl shadow-black/80"
      style={{
        top: pos.top,
        left: Math.max(8, pos.left),
        backgroundColor: "#0f1218",
      }}
    >
      <aside
        className="w-[9.5rem] shrink-0 border-r border-zinc-700 p-2"
        style={{ backgroundColor: "#0f1218" }}
      >
        <ul className="space-y-0.5">
          {PRESETS.map((p) => {
            const selected = activePreset === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-full px-3 py-2 text-left text-sm text-zinc-300 transition",
                    selected ? "bg-zinc-800 text-white" : "hover:bg-zinc-900",
                  )}
                >
                  <span>{p.label}</span>
                  {selected ? <Check className="size-3.5 shrink-0" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div
        className="w-[17.5rem] shrink-0 p-4"
        style={{ backgroundColor: "#0f1218" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="text-sm font-medium capitalize text-white">
            {format(month, "MMMM yyyy", { locale: ptBR })}
          </p>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div
          className="mb-1 grid text-center text-[11px] text-zinc-500"
          style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
        >
          {WEEKDAYS.map((d, i) => (
            <span key={`${d}-${i}`} className="py-1">
              {d}
            </span>
          ))}
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
        >
          {calendarDays.map((day) => {
            const { start, end, inRange, outside } = dayState(day);
            const endpoint = start || end;
            return (
              <button
                key={toYmd(day)}
                type="button"
                onClick={() => onDayClick(day)}
                className={cn(
                  "relative flex h-9 w-full items-center justify-center text-sm transition",
                  outside && "text-zinc-600",
                  !outside && !inRange && "text-zinc-100",
                  inRange && !endpoint && "bg-zinc-800 text-zinc-100",
                  inRange && start && !end && "rounded-l-full bg-zinc-800",
                  inRange && end && !start && "rounded-r-full bg-zinc-800",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full",
                    endpoint && "bg-white font-semibold text-zinc-950",
                  )}
                >
                  {format(day, "d")}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-700 pt-3">
          <p className="text-xs text-zinc-500">
            {pickingEnd
              ? "Escolha a data final"
              : `${format(parseYmd(draft.from), "dd/MM", { locale: ptBR })} – ${format(parseYmd(draft.to), "dd/MM", { locale: ptBR })}`}
          </p>
          <button
            type="button"
            onClick={applyDraft}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-w-[12rem] items-center justify-between gap-2 rounded-full border border-[var(--bn-border)] bg-[var(--bn-surface)] px-4 py-2 text-sm font-medium text-[var(--bn-on)] hover:bg-[var(--bn-hover)]"
      >
        <span className="capitalize">{formatTriggerLabel(value)}</span>
        <ChevronRight
          className={cn(
            "size-4 text-[var(--bn-muted)] transition",
            open && "rotate-90",
          )}
        />
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

export function eachYmdInRange(range: DateRangeYmd): string[] {
  const start = parseYmd(range.from);
  const end = parseYmd(range.to);
  return eachDayOfInterval({
    start: start <= end ? start : end,
    end: start <= end ? end : start,
  }).map(toYmd);
}

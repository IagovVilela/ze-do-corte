"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type Hsv = { h: number; s: number; v: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function normalizeHexColor(raw: string, fallback = "#3b82f6"): string {
  const t = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(t)) {
    const r = t[1]!;
    const g = t[2]!;
    const b = t[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHexColor(hex);
  return [
    Number.parseInt(h.slice(1, 3), 16),
    Number.parseInt(h.slice(3, 5), 16),
    Number.parseInt(h.slice(5, 7), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return [(rp + m) * 255, (gp + m) * 255, (bp + m) * 255];
}

function hsvToHex(hsv: Hsv): string {
  const [r, g, b] = hsvToRgb(hsv.h, hsv.s, hsv.v);
  return rgbToHex(r, g, b);
}

function hexToHsv(hex: string): Hsv {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

type WheelProps = {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
};

/** Anel de matiz + quadrado saturação/brilho — arraste as bolinhas. */
function ColorWheel({ value, onChange, size = 236 }: WheelProps) {
  const hsv = useMemo(() => hexToHsv(value), [value]);
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<"hue" | "sv" | null>(null);

  const ringOuter = size / 2;
  const ringInner = ringOuter * 0.72;
  const sq = ringInner * 1.22;
  const sqLeft = (size - sq) / 2;
  const sqTop = (size - sq) / 2;

  const emit = useCallback(
    (next: Hsv) => {
      onChange(hsvToHex(next));
    },
    [onChange],
  );

  const applyFromPoint = useCallback(
    (clientX: number, clientY: number, mode: "hue" | "sv") => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const cx = size / 2;
      const cy = size / 2;

      if (mode === "hue") {
        // conic-gradient: 0° no topo, sentido horário
        const h =
          ((Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90 + 360) % 360;
        emit({ ...hsv, h });
        return;
      }

      const sx = clamp((x - sqLeft) / sq, 0, 1);
      const sy = clamp((y - sqTop) / sq, 0, 1);
      emit({ ...hsv, s: sx, v: 1 - sy });
    },
    [emit, hsv, size, sq, sqLeft, sqTop],
  );

  const onPointerDown = (e: ReactPointerEvent, mode: "hue" | "sv") => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = mode;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    applyFromPoint(e.clientX, e.clientY, mode);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag.current) return;
    applyFromPoint(e.clientX, e.clientY, drag.current);
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  // Posição da bolinha no anel (0° = topo, horário — igual ao conic-gradient)
  const hueAngle = ((hsv.h - 90) * Math.PI) / 180;
  const ringMid = (ringOuter + ringInner) / 2;
  const hueX = size / 2 + Math.cos(hueAngle) * ringMid;
  const hueY = size / 2 + Math.sin(hueAngle) * ringMid;

  const svX = sqLeft + hsv.s * sq;
  const svY = sqTop + (1 - hsv.v) * sq;
  const pure = `hsl(${hsv.h} 100% 50%)`;

  return (
    <div
      ref={rootRef}
      className="relative mx-auto touch-none select-none"
      style={{ width: size, height: size }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Anel de matiz */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
          WebkitMaskImage: `radial-gradient(circle, transparent ${ringInner - 0.5}px, #000 ${ringInner}px)`,
          maskImage: `radial-gradient(circle, transparent ${ringInner - 0.5}px, #000 ${ringInner}px)`,
        }}
        onPointerDown={(e) => {
          const el = rootRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const dx = e.clientX - rect.left - size / 2;
          const dy = e.clientY - rect.top - size / 2;
          const dist = Math.hypot(dx, dy);
          if (dist < ringInner - 2 || dist > ringOuter + 2) return;
          onPointerDown(e, "hue");
        }}
      />

      {/* Quadrado saturação × brilho */}
      <div
        className="absolute overflow-hidden rounded-md shadow-inner ring-1 ring-white/20"
        style={{
          left: sqLeft,
          top: sqTop,
          width: sq,
          height: sq,
          background: `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, ${pure})
          `,
        }}
        onPointerDown={(e) => onPointerDown(e, "sv")}
      />

      {/* Bolinha da matiz */}
      <span
        aria-hidden
        className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
        style={{
          left: hueX,
          top: hueY,
          backgroundColor: pure,
        }}
      />

      {/* Bolinha saturação/brilho */}
      <span
        aria-hidden
        className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
        style={{
          left: svX,
          top: svY,
          backgroundColor: value,
        }}
      />
    </div>
  );
}

type FieldProps = {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
  swatchClassName?: string;
  fallback?: string;
  "aria-label"?: string;
};

/**
 * Substitui o `input type="color"` nativo (3 canais HSV).
 * Abre uma roda: anel de matiz + bolinha no quadrado de cor.
 */
export function ColorWheelField({
  value,
  onChange,
  className,
  swatchClassName,
  fallback = "#3b82f6",
  "aria-label": ariaLabel = "Escolher cor",
}: FieldProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => normalizeHexColor(value, fallback));
  const [hexText, setHexText] = useState(() =>
    normalizeHexColor(value, fallback),
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      const next = normalizeHexColor(value, fallback);
      setDraft(next);
      setHexText(next);
    }
  }, [value, fallback, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const hex = normalizeHexColor(value, fallback);

  function openPicker() {
    const next = normalizeHexColor(value, fallback);
    setDraft(next);
    setHexText(next);
    setOpen(true);
  }

  function applyAndClose() {
    const next = normalizeHexColor(hexText, draft);
    onChange(next);
    setOpen(false);
  }

  function onWheelChange(next: string) {
    setDraft(next);
    setHexText(next);
    onChange(next);
  }

  const dialog =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/70"
              aria-label="Fechar"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-[1] w-full max-w-sm rounded-t-2xl border border-white/10 bg-zinc-950 p-4 shadow-2xl sm:rounded-2xl"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p
                    id={titleId}
                    className="text-sm font-semibold text-zinc-100"
                  >
                    Escolher cor
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Arraste a bolinha até a cor que quiser.
                  </p>
                </div>
                <span
                  className="size-10 shrink-0 rounded-lg border border-white/15 ring-1 ring-white/10"
                  style={{ backgroundColor: draft }}
                  aria-hidden
                />
              </div>

              <ColorWheel value={draft} onChange={onWheelChange} />

              <div className="mt-4 flex items-center gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-zinc-400">
                  <span className="shrink-0">Hex</span>
                  <input
                    value={hexText}
                    onChange={(e) => setHexText(e.target.value)}
                    onBlur={() => {
                      const next = normalizeHexColor(hexText, draft);
                      setHexText(next);
                      setDraft(next);
                      onChange(next);
                    }}
                    className="w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 font-mono text-sm uppercase text-zinc-100 outline-none focus:border-brand-500/50"
                    spellCheck={false}
                    inputMode="text"
                    aria-label="Código hexadecimal da cor"
                  />
                </label>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={applyAndClose}
                  className="rounded-full bg-brand-400 px-4 py-2 text-sm font-bold text-zinc-950"
                >
                  Pronto
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn(
          "h-8 w-14 shrink-0 cursor-pointer rounded-lg border border-white/10 p-0.5 transition hover:border-white/25",
          className,
          swatchClassName,
        )}
      >
        <span
          className="block h-full w-full rounded-md"
          style={{ backgroundColor: hex }}
        />
      </button>
      {dialog}
    </>
  );
}

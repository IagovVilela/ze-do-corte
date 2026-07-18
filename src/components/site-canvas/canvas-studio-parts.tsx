"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { ColorWheelField } from "@/components/color-wheel-field";
import { CanvasElementView } from "@/components/tenant-canvas-renderer";
import {
  BUTTON_STYLE_PRESETS,
  PANEL_STYLE_PRESETS,
  PREMADE_SECTIONS,
  RECT_STYLE_PRESETS,
  TYPOGRAPHY_PRESETS,
  applyStylePreset,
  createPremadeSection,
  createStyledLibraryElement,
  stylePresetsForType,
  type PremadeSectionId,
} from "@/lib/canvas-presets";
import {
  CANVAS_MEDIA_ACCEPT,
  isCanvasVideoUrl,
} from "@/lib/canvas-media";
import {
  CANVAS_BG_ART_OPTIONS,
  canvasBgArtPreviewStyle,
} from "@/lib/canvas-bg-art";
import {
  alignFrameToArtboard,
  CANVAS_SNAP_GRID,
  guidesForCenteredFrame,
  snapFrameToGrid,
  snapFrameWithSmartGuides,
  snapToGrid,
  type ArtboardAlign,
  type SmartGuide,
} from "@/lib/canvas-layout-grid";
import { PAGE_TEMPLATE_META } from "@/lib/canvas-page-templates";
import { canvasThemeStyle } from "@/lib/canvas-theme-style";
import type { OrganizationPublic } from "@/lib/organization";
import {
  type CanvasArtboardId,
  type CanvasElement,
  type CanvasElementType,
  type CanvasTemplateId,
  type SiteCanvasConfig,
  createLibraryElement,
  elementsForArtboard,
} from "@/lib/site-canvas";
import type { PublicBarber, ServiceSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type UnitInfo = {
  id: string;
  name: string;
  addressLine: string | null;
  city: string | null;
  isDefault: boolean;
};

type DragMode =
  | { kind: "move"; startX: number; startY: number; ox: number; oy: number }
  | {
      kind: "resize";
      handle: string;
      startX: number;
      startY: number;
      frame: CanvasElement["frame"];
    };

const LIBRARY_GROUPS: {
  title: string;
  items: { type: CanvasElementType; label: string; hint: string }[];
}[] = [
  {
    title: "Básicos",
    items: [
      { type: "text", label: "Texto", hint: "Títulos e parágrafos" },
      { type: "button", label: "Botão", hint: "CTA / link" },
      { type: "badge", label: "Badge", hint: "Selo ou etiqueta" },
      { type: "divider", label: "Divisor", hint: "Linha separadora" },
      {
        type: "spacer",
        label: "Espaço",
        hint: "Respiro vertical (listrado no editor)",
      },
    ],
  },
  {
    title: "Layout",
    items: [
      { type: "hero", label: "Hero", hint: "Faixa de abertura com CTA" },
      { type: "panel", label: "Painel", hint: "Card / bloco destacado" },
      { type: "grid", label: "Grid", hint: "Grade de cartões" },
      {
        type: "rect",
        label: "Faixa / bloco",
        hint: "Forma sólida de cor (fundo da marca)",
      },
    ],
  },
  {
    title: "Mídia",
    items: [
      { type: "image", label: "Imagem", hint: "Carregar do celular/PC" },
      { type: "media", label: "Mídia", hint: "Imagem ou vídeo do dispositivo" },
    ],
  },
  {
    title: "Negócio",
    items: [
      { type: "navbar", label: "Menu", hint: "Logo + agendar" },
      { type: "services", label: "Serviços", hint: "Catálogo real" },
      { type: "team", label: "Equipe", hint: "Barbeiros da home" },
      { type: "contact", label: "Contato", hint: "Unidades e horários" },
      { type: "footer", label: "Rodapé", hint: "Créditos / redes" },
    ],
  },
];

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

const snap = (n: number) => snapToGrid(n, CANVAS_SNAP_GRID);

type Props = {
  canvas: SiteCanvasConfig;
  onChange: (next: SiteCanvasConfig) => void;
  /** Início de arrastar / redimensionar (um passo no histórico). */
  onInteractionStart?: () => void;
  /** Fim do gesto no canvas. */
  onInteractionEnd?: () => void;
  artboard: CanvasArtboardId;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  org: OrganizationPublic;
  services: ServiceSummary[];
  barbers: PublicBarber[];
  units: UnitInfo[];
  slogans: { primary: string; secondary: string };
  onDuplicate?: () => void;
  onDelete?: () => void;
  onBringFront?: () => void;
  onSendBack?: () => void;
  onToggleLock?: () => void;
  onOpenInspector?: () => void;
  onOpenOptions?: () => void;
};

export const ELEMENT_TYPE_LABEL: Record<CanvasElementType, string> = {
  text: "Texto",
  button: "Botão",
  badge: "Badge",
  divider: "Divisor",
  spacer: "Espaço",
  hero: "Hero",
  panel: "Painel",
  grid: "Grid",
  rect: "Faixa / bloco",
  image: "Imagem",
  media: "Mídia",
  navbar: "Menu",
  services: "Serviços",
  team: "Equipe",
  contact: "Contato",
  footer: "Rodapé",
};

export function CanvasStage({
  canvas,
  onChange,
  onInteractionStart,
  onInteractionEnd,
  artboard,
  selectedId,
  onSelect,
  org,
  services,
  barbers,
  units,
  slogans,
  onDuplicate,
  onDelete,
  onBringFront,
  onSendBack,
  onToggleLock,
  onOpenInspector,
  onOpenOptions,
}: Props) {
  const board = canvas.artboards[artboard];
  const elements = elementsForArtboard(canvas, artboard);
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.55);
  const [userZoomed, setUserZoomed] = useState(false);
  const [activeGuides, setActiveGuides] = useState<SmartGuide[]>([]);
  const drag = useRef<DragMode | null>(null);

  const resetScrollHome = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    el.scrollTop = 0;
  }, []);

  const fitZoom = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const narrow = window.matchMedia("(max-width: 1023px)").matches;
    const pad = narrow ? 24 : 64;
    const avail = Math.max(120, el.clientWidth - pad);
    const next = Math.min(1.15, Math.max(0.18, avail / board.width));
    setZoom(Number(next.toFixed(2)));
    setUserZoomed(false);
    // Depois do layout do scale, volta o scroll para o canto superior esquerdo.
    requestAnimationFrame(() => {
      resetScrollHome();
      requestAnimationFrame(resetScrollHome);
    });
  }, [board.width, resetScrollHome]);

  useEffect(() => {
    setUserZoomed(false);
  }, [artboard, board.width]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const sync = () => {
      if (userZoomed) return;
      fitZoom();
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitZoom, userZoomed]);

  useEffect(() => {
    resetScrollHome();
  }, [artboard, zoom, resetScrollHome]);

  const ctx = {
    org,
    services,
    barbers,
    units,
    homeHref: `/${org.slug}`,
    bookHref: `/${org.slug}/agendar`,
    slogans,
    interactive: false,
    editorChrome: true,
  };

  const updateElement = useCallback(
    (id: string, patch: Partial<CanvasElement>) => {
      onChange({
        ...canvas,
        elements: canvas.elements.map((e) =>
          e.id === id ? { ...e, ...patch } : e,
        ),
      });
    },
    [canvas, onChange],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const mode = drag.current;
      if (!mode || !selectedId) return;
      const el = canvas.elements.find((x) => x.id === selectedId);
      if (!el || el.locked) return;
      const dx = (e.clientX - mode.startX) / zoom;
      const dy = (e.clientY - mode.startY) / zoom;

      if (mode.kind === "move") {
        const peers = canvas.elements
          .filter((x) => x.artboard === artboard && x.id !== selectedId)
          .map((x) => x.frame);
        const raw = {
          ...el.frame,
          x: mode.ox + dx,
          y: mode.oy + dy,
        };
        const { frame, guides } = snapFrameWithSmartGuides(
          raw,
          board,
          peers,
        );
        setActiveGuides(guides);
        updateElement(selectedId, { frame });
        return;
      }

      const f = { ...mode.frame };
      const h = mode.handle;
      if (h.includes("e")) f.w = Math.max(24, snap(mode.frame.w + dx));
      if (h.includes("s")) f.h = Math.max(24, snap(mode.frame.h + dy));
      if (h.includes("w")) {
        const nw = Math.max(24, snap(mode.frame.w - dx));
        f.x = snap(mode.frame.x + (mode.frame.w - nw));
        f.w = nw;
      }
      if (h.includes("n")) {
        const nh = Math.max(24, snap(mode.frame.h - dy));
        f.y = snap(mode.frame.y + (mode.frame.h - nh));
        f.h = nh;
      }
      setActiveGuides([]);
      updateElement(selectedId, { frame: f });
    },
    [
      artboard,
      board,
      canvas.elements,
      selectedId,
      updateElement,
      zoom,
    ],
  );

  const endDrag = useCallback(() => {
    drag.current = null;
    setActiveGuides([]);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    onInteractionEnd?.();
  }, [onInteractionEnd, onPointerMove]);

  function startMove(e: ReactPointerEvent, id: string) {
    e.stopPropagation();
    e.preventDefault();
    const el = canvas.elements.find((x) => x.id === id);
    if (!el || el.locked) return;
    onSelect(id);
    onInteractionStart?.();
    drag.current = {
      kind: "move",
      startX: e.clientX,
      startY: e.clientY,
      ox: el.frame.x,
      oy: el.frame.y,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  }

  function startResize(e: ReactPointerEvent, id: string, handle: string) {
    e.stopPropagation();
    e.preventDefault();
    const el = canvas.elements.find((x) => x.id === id);
    if (!el || el.locked) return;
    onSelect(id);
    onInteractionStart?.();
    drag.current = {
      kind: "resize",
      handle,
      startX: e.clientX,
      startY: e.clientY,
      frame: { ...el.frame },
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bn-surface-container)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--bn-border)] px-3 py-2 text-xs text-[var(--bn-on-variant)]">
        <span className="shrink-0">Zoom</span>
        <input
          type="range"
          min={0.18}
          max={1.2}
          step={0.02}
          value={zoom}
          onChange={(e) => {
            setUserZoomed(true);
            setZoom(Number(e.target.value));
          }}
          className="w-24 sm:w-32"
          aria-label="Zoom do canvas"
        />
        <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={fitZoom}
          className="rounded-md border border-[var(--bn-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--bn-on-variant)] hover:bg-[var(--bn-hover)]"
        >
          Ajustar
        </button>
        <span className="ml-auto hidden text-[var(--bn-muted)] lg:inline">
          {board.width}×{board.height}px · clique para selecionar · arraste para
          mover
        </span>
        <span className="ml-auto text-[10px] text-[var(--bn-muted)] lg:hidden">
          {board.width}×{board.height}
        </span>
      </div>
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 touch-pan-x touch-pan-y overflow-auto p-3 sm:p-6 lg:p-8"
        onClick={() => onSelect(null)}
      >
        {/*
          Wrapper com o tamanho *visual* (já com zoom). Sem isso, o scale
          mantém 1440px no layout e o scroll abre no meio da página.
        */}
        <div
          className="mx-auto"
          style={{
            width: board.width * zoom,
            height: board.height * zoom,
          }}
        >
          <div
            ref={stageRef}
            className="relative shadow-2xl shadow-black/60 ring-1 ring-[var(--bn-border)]"
            style={{
              ...canvasThemeStyle(canvas.theme, org.primaryColor),
              width: board.width,
              height: board.height,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            {(canvas.theme?.bgArt ?? "none") === "none" ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 opacity-[0.28]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)",
                  backgroundSize: `${CANVAS_SNAP_GRID}px ${CANVAS_SNAP_GRID}px`,
                }}
              />
            ) : null}
            {(activeGuides.length
              ? activeGuides
              : selectedId
                ? guidesForCenteredFrame(
                    canvas.elements.find((e) => e.id === selectedId)?.frame ?? {
                      x: 0,
                      y: 0,
                      w: 0,
                      h: 0,
                    },
                    board,
                  )
                : []
            ).map((g, i) =>
              g.axis === "v" ? (
                <div
                  key={`vg-${i}-${g.pos}`}
                  aria-hidden
                  className="pointer-events-none absolute top-0 z-[5] w-0.5 bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.9)]"
                  style={{ left: g.pos, height: board.height }}
                />
              ) : (
                <div
                  key={`hg-${i}-${g.pos}`}
                  aria-hidden
                  className="pointer-events-none absolute left-0 z-[5] h-0.5 bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.9)]"
                  style={{ top: g.pos, width: board.width }}
                />
              ),
            )}
            {elements.map((el) => {
              const selected = el.id === selectedId;
              return (
                <div
                  key={el.id}
                  className={cn(
                    "absolute touch-none outline-offset-0",
                    selected &&
                      "outline outline-2 outline-[var(--bn-primary)] ring-1 ring-[var(--bn-primary)]/40",
                    el.locked && "opacity-70",
                  )}
                  style={{
                    left: el.frame.x,
                    top: el.frame.y,
                    width: el.frame.w,
                    height: el.frame.h,
                    zIndex: el.zIndex,
                  }}
                  onPointerDown={(e) => startMove(e, el.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(el.id);
                  }}
                >
                  {selected ? (
                    <div
                      className="pointer-events-auto absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/95 p-1 shadow-xl backdrop-blur-sm"
                      style={{ top: -46 }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ToolbarBtn
                        label="Duplicar"
                        onClick={() => onDuplicate?.()}
                      >
                        <path
                          d="M8 8h10v12H8zM6 6h10"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          fill="none"
                        />
                      </ToolbarBtn>
                      <ToolbarBtn
                        label="Trazer à frente"
                        onClick={() => onBringFront?.()}
                      >
                        <path
                          d="M12 16V6M8 10l4-4 4 4"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </ToolbarBtn>
                      <ToolbarBtn
                        label="Enviar para trás"
                        onClick={() => onSendBack?.()}
                      >
                        <path
                          d="M12 8v10M8 14l4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </ToolbarBtn>
                      <ToolbarBtn
                        label={el.locked ? "Desbloquear" : "Bloquear"}
                        active={Boolean(el.locked)}
                        onClick={() => onToggleLock?.()}
                      >
                        <path
                          d="M8 11V8a4 4 0 0 1 8 0v3M7 11h10v9H7z"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          fill="none"
                        />
                      </ToolbarBtn>
                      <ToolbarBtn
                        label="Editar"
                        className="lg:hidden"
                        onClick={() => onOpenInspector?.()}
                      >
                        <path
                          d="M4 17v3h3L17 10l-3-3L4 17z"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          fill="none"
                        />
                      </ToolbarBtn>
                      <ToolbarBtn
                        label="Opções"
                        className="lg:hidden"
                        onClick={() => onOpenOptions?.()}
                      >
                        <circle cx="6" cy="12" r="1.5" fill="currentColor" />
                        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                        <circle cx="18" cy="12" r="1.5" fill="currentColor" />
                      </ToolbarBtn>
                      <ToolbarBtn
                        label="Excluir"
                        danger
                        onClick={() => onDelete?.()}
                      >
                        <path
                          d="M6 8h12M10 8V6h4v2M9 8v10h6V8"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          fill="none"
                        />
                      </ToolbarBtn>
                    </div>
                  ) : null}
                  <div className="pointer-events-none h-full w-full [&_a]:pointer-events-none">
                    <CanvasElementView
                      element={el}
                      board={board}
                      ctx={ctx}
                      layout="fill"
                    />
                  </div>
                  {selected
                    ? HANDLES.map((h) => (
                        <span
                          key={h}
                          onPointerDown={(e) => startResize(e, el.id, h)}
                          className={cn(
                            "absolute z-10 touch-none rounded-sm border border-[var(--bn-primary)] bg-[var(--bn-primary-container)]",
                            "h-4 w-4 lg:h-3 lg:w-3",
                            h === "nw" &&
                              "-left-2 -top-2 cursor-nwse-resize lg:-left-1.5 lg:-top-1.5",
                            h === "n" &&
                              "-top-2 left-1/2 -translate-x-1/2 cursor-ns-resize lg:-top-1.5",
                            h === "ne" &&
                              "-right-2 -top-2 cursor-nesw-resize lg:-right-1.5 lg:-top-1.5",
                            h === "e" &&
                              "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize lg:-right-1.5",
                            h === "se" &&
                              "-bottom-2 -right-2 cursor-nwse-resize lg:-bottom-1.5 lg:-right-1.5",
                            h === "s" &&
                              "-bottom-2 left-1/2 -translate-x-1/2 cursor-ns-resize lg:-bottom-1.5",
                            h === "sw" &&
                              "-bottom-2 -left-2 cursor-nesw-resize lg:-bottom-1.5 lg:-left-1.5",
                            h === "w" &&
                              "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize lg:-left-1.5",
                          )}
                        />
                      ))
                    : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

type LibraryTab = "elements" | "sections" | "ready";

function ToolbarBtn({
  label,
  onClick,
  children,
  danger,
  active,
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full text-[var(--bn-on)] transition hover:bg-[var(--bn-hover)]",
        danger && "text-rose-700 hover:bg-rose-500/20",
        active && "bg-[var(--bn-primary-container)]/25 text-[var(--bn-primary)]",
        className,
      )}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

export function PageTemplatePicker({
  open,
  busy,
  onClose,
  onPick,
}: {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onPick: (id: CanvasTemplateId) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--bn-scrim)]"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        className="relative z-[1] max-h-[min(92svh,720px)] w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--bn-border)] shadow-2xl max-sm:max-h-[92svh] max-sm:rounded-t-2xl max-sm:rounded-b-none"
        style={{ backgroundColor: "var(--bn-surface-elevated)" }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--bn-border)] px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
              Modelos de página
            </p>
            <h2 className="mt-1 font-brand-headline text-xl font-bold tracking-tight text-[var(--bn-on)] sm:text-2xl">
              Escolha um layout completo
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--bn-on-variant)] max-sm:text-xs">
              Cada modelo tem composição, cores e tipografia próprias. Aplicar
              substitui o canvas atual (desktop e celular).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-[var(--bn-border)] px-3 py-1 text-xs text-[var(--bn-on-variant)] hover:bg-[var(--bn-hover)]"
          >
            Fechar
          </button>
        </div>
        <div className="grid max-h-[min(70vh,560px)] gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5 max-sm:max-h-[calc(92svh-7rem)]">
          {PAGE_TEMPLATE_META.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              disabled={busy}
              onClick={() => onPick(tpl.id)}
              className="group rounded-xl border border-[var(--bn-border)] bg-[var(--bn-hover)] p-3 text-left transition hover:border-[var(--bn-primary)]/40 hover:bg-[var(--bn-primary-container)]/10 disabled:opacity-50"
            >
              <div
                className="mb-3 h-16 overflow-hidden rounded-lg border border-[var(--bn-border)]"
                style={{
                  background: `linear-gradient(135deg, ${tpl.swatch} 0%, #09090b 72%)`,
                }}
              >
                <div className="flex h-full items-end p-2">
                  <span className="rounded bg-[var(--bn-scrim)] px-1.5 py-0.5 text-[10px] text-[var(--bn-on)]/80">
                    {tpl.vibe}
                  </span>
                </div>
              </div>
              <p className="text-sm font-semibold text-[var(--bn-on)] group-hover:text-[var(--bn-on)]">
                {tpl.label}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--bn-muted)]">
                {tpl.tagline}
              </p>
              <p className="mt-2 font-mono text-[10px] text-[var(--bn-muted)]">
                {tpl.layoutHint}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ElementLibrary({
  artboard,
  boardW,
  atY,
  onAdd,
  onAddMany,
  className,
}: {
  artboard: CanvasArtboardId;
  boardW: number;
  atY: number;
  onAdd: (el: CanvasElement) => void;
  onAddMany: (els: CanvasElement[]) => void;
  className?: string;
}) {
  const [tab, setTab] = useState<LibraryTab>("elements");

  function addSection(id: PremadeSectionId) {
    onAddMany(createPremadeSection(id, artboard, boardW, atY));
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col gap-2 overflow-hidden p-3",
        className,
      )}
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
          Biblioteca
        </p>
        <p className="mt-1 text-[11px] text-[var(--bn-muted)]">
          Solta em Y≈{Math.round(atY)} no arteboard {artboard}.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-[var(--bn-border)] p-0.5">
        {(
          [
            ["elements", "Itens"],
            ["sections", "Seções"],
            ["ready", "Prontos"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-md px-1.5 py-1 text-[10px] font-semibold",
              tab === id
                ? "bg-[var(--bn-primary-container)] text-white"
                : "text-[var(--bn-on-variant)] hover:bg-[var(--bn-hover)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {tab === "elements" ? (
          LIBRARY_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
                {group.title}
              </p>
              <div className="grid gap-1">
                {group.items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    title={item.hint}
                    className="rounded-lg border border-[var(--bn-border)] bg-[var(--bn-hover)] px-3 py-2 text-left hover:border-[var(--bn-primary)]/40 hover:bg-[var(--bn-primary-container)]/10"
                    onClick={() =>
                      onAdd(
                        createLibraryElement(item.type, artboard, boardW, atY),
                      )
                    }
                  >
                    <span className="block text-sm text-[var(--bn-on)]">
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-[var(--bn-muted)]">
                      {item.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : null}

        {tab === "sections" ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
              Seções pré-montadas
            </p>
            <p className="text-[11px] text-[var(--bn-muted)]">
              Insere vários elementos de uma vez, já posicionados.
            </p>
            <div className="grid gap-1">
              {PREMADE_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  title={s.hint}
                  className="rounded-lg border border-[var(--bn-primary)]/25 bg-[var(--bn-primary-container)]/5 px-3 py-2 text-left hover:border-[var(--bn-primary)]/50 hover:bg-[var(--bn-primary-container)]/15"
                  onClick={() => addSection(s.id)}
                >
                  <span className="block text-sm text-[var(--bn-on)]">{s.label}</span>
                  <span className="block text-[10px] text-[var(--bn-muted)]">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "ready" ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
                Faixas e blocos
              </p>
              <p className="text-[11px] text-[var(--bn-muted)]">
                Formas sólidas como a faixa azul larga da marca.
              </p>
              <div className="grid gap-1">
                {RECT_STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.hint}
                    className="rounded-lg border border-[var(--bn-primary)]/25 bg-[var(--bn-primary-container)]/5 px-3 py-2 text-left hover:border-[var(--bn-primary)]/50 hover:bg-[var(--bn-primary-container)]/15"
                    onClick={() => {
                      const el = createStyledLibraryElement(
                        "rect",
                        preset.id,
                        artboard,
                        boardW,
                        atY,
                      );
                      if (el) onAdd(el);
                    }}
                  >
                    <span className="block text-sm text-[var(--bn-on)]">
                      {preset.label}
                    </span>
                    <span className="block text-[10px] text-[var(--bn-muted)]">
                      {preset.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
                Cards / painéis
              </p>
              <div className="grid gap-1">
                {PANEL_STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.hint}
                    className="rounded-lg border border-[var(--bn-border)] bg-[var(--bn-hover)] px-3 py-2 text-left hover:border-[var(--bn-primary)]/40"
                    onClick={() => {
                      const el = createStyledLibraryElement(
                        "panel",
                        preset.id,
                        artboard,
                        boardW,
                        atY,
                      );
                      if (el) onAdd(el);
                    }}
                  >
                    <span className="block text-sm text-[var(--bn-on)]">
                      {preset.label}
                    </span>
                    <span className="block text-[10px] text-[var(--bn-muted)]">
                      {preset.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
                Tipos de botão
              </p>
              <div className="grid gap-1">
                {BUTTON_STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.hint}
                    className="rounded-lg border border-[var(--bn-border)] bg-[var(--bn-hover)] px-3 py-2 text-left hover:border-[var(--bn-primary)]/40"
                    onClick={() => {
                      const el = createStyledLibraryElement(
                        "button",
                        preset.id,
                        artboard,
                        boardW,
                        atY,
                      );
                      if (el) onAdd(el);
                    }}
                  >
                    <span className="block text-sm text-[var(--bn-on)]">
                      {preset.label}
                    </span>
                    <span className="block text-[10px] text-[var(--bn-muted)]">
                      {preset.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
                Outros prontos
              </p>
              <div className="grid gap-1">
                {(
                  [
                    ["badge", "pill-brand", "Badge pílula"],
                    ["badge", "outline", "Badge contorno"],
                    ["text", "display", "Texto display"],
                    ["text", "eyebrow", "Texto eyebrow"],
                    ["hero", "cinematic", "Hero cinema"],
                  ] as const
                ).map(([type, presetId, label]) => (
                  <button
                    key={`${type}-${presetId}`}
                    type="button"
                    className="rounded-lg border border-[var(--bn-border)] bg-[var(--bn-hover)] px-3 py-2 text-left text-sm text-[var(--bn-on)] hover:border-[var(--bn-primary)]/40"
                    onClick={() => {
                      const el = createStyledLibraryElement(
                        type,
                        presetId,
                        artboard,
                        boardW,
                        atY,
                      );
                      if (el) onAdd(el);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export function ThemePanel({
  theme,
  onChange,
  onBindElements,
  className,
}: {
  theme: SiteCanvasConfig["theme"];
  onChange: (theme: NonNullable<SiteCanvasConfig["theme"]>) => void;
  onBindElements?: () => void;
  className?: string;
}) {
  const t = theme ?? {};
  const row =
    "mt-1 w-full rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface-container)] px-2 py-1.5 text-sm text-[var(--bn-on)]";

  function set(
    key: keyof NonNullable<SiteCanvasConfig["theme"]>,
    value: string,
  ) {
    onChange({ ...t, [key]: value });
  }

  const activeTypo =
    TYPOGRAPHY_PRESETS.find(
      (p) =>
        (p.theme.fontDisplay ?? "") === (t.fontDisplay ?? "") &&
        (p.theme.fontBody ?? "") === (t.fontBody ?? ""),
    )?.id ?? null;

  return (
    <div
      className={cn(
        "max-h-[42vh] space-y-3 overflow-y-auto border-b border-[var(--bn-border)] px-3 pb-3",
        className,
      )}
    >
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
          Cores do sistema
        </p>
        <p className="text-[11px] leading-relaxed text-[var(--bn-muted)]">
          Controla o site inteiro no canvas: fundo, textos, painéis, botões e o
          Catálogo (preço/badge = Principal). Use “Aplicar cores aos elementos”
          se algum bloco ainda estiver com cor fixa.
        </p>
        {(
          [
            ["primary", "Principal", "#3b82f6"],
            ["secondary", "Secundária", "#a8a29e"],
            ["background", "Fundo", "#0f1419"],
            ["surface", "Superfície", "#18181b"],
            ["text", "Texto", "#fafafa"],
          ] as const
        ).map(([key, label, fallback]) => (
          <div
            key={key}
            className="flex items-center justify-between gap-2 text-xs text-[var(--bn-on-variant)]"
          >
            <span>{label}</span>
            <ColorWheelField
              aria-label={`Cor ${label}`}
              fallback={fallback}
              value={
                (t[key] as string | undefined)?.startsWith("#")
                  ? (t[key] as string)
                  : fallback
              }
              onChange={(hex) => set(key, hex)}
              className={cn(row, "h-8 w-14 shrink-0 p-0.5")}
            />
          </div>
        ))}

        <div className="pt-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
            Arte de fundo
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--bn-muted)]">
            Textura ou padrão sobre a cor de fundo (aparece no site ao salvar).
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {CANVAS_BG_ART_OPTIONS.map((opt) => {
              const active = (t.bgArt ?? "none") === opt.id;
              const artColor = t.bgArtColor?.startsWith("#")
                ? t.bgArtColor
                : t.primary?.startsWith("#")
                  ? t.primary
                  : "#a1a1aa";
              return (
                <button
                  key={opt.id}
                  type="button"
                  title={opt.hint}
                  onClick={() => set("bgArt", opt.id)}
                  className={cn(
                    "overflow-hidden rounded-lg border text-left transition",
                    active
                      ? "border-[var(--bn-primary)] ring-1 ring-[var(--bn-primary)]/50"
                      : "border-[var(--bn-border)] hover:border-[var(--bn-border)]",
                  )}
                >
                  <div
                    className="h-10 w-full"
                    style={canvasBgArtPreviewStyle(
                      opt.id,
                      t.background?.startsWith("#") ? t.background : "#0f1419",
                      {
                        color: artColor,
                        strength: Math.max(t.bgArtStrength ?? 45, 65),
                        primary: t.primary,
                      },
                    )}
                  />
                  <span className="block px-1.5 py-1 text-[10px] font-medium text-[var(--bn-on-variant)]">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          {(t.bgArt ?? "none") !== "none" ? (
            <div className="mt-2 space-y-2 rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface-container)]/40 p-2">
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--bn-on-variant)]">
                <span>Cor das linhas</span>
                <ColorWheelField
                  aria-label="Cor das linhas"
                  fallback="#a1a1aa"
                  value={
                    t.bgArtColor?.startsWith("#")
                      ? t.bgArtColor
                      : t.primary?.startsWith("#")
                        ? t.primary
                        : "#a1a1aa"
                  }
                  onChange={(hex) => set("bgArtColor", hex)}
                  className={cn(row, "h-8 w-14 shrink-0 p-0.5")}
                />
              </div>
              <label className="block space-y-1 text-xs text-[var(--bn-on-variant)]">
                <span className="flex justify-between">
                  Intensidade
                  <span className="text-[var(--bn-muted)]">{t.bgArtStrength ?? 45}%</span>
                </span>
                <input
                  type="range"
                  min={8}
                  max={90}
                  step={1}
                  value={t.bgArtStrength ?? 45}
                  onChange={(e) =>
                    onChange({
                      ...t,
                      bgArtStrength: Number(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </label>
            </div>
          ) : null}
        </div>

        {onBindElements ? (
          <button
            type="button"
            onClick={onBindElements}
            className="mt-1 w-full rounded-lg border border-[var(--bn-primary)]/40 bg-[var(--bn-primary-container)]/10 px-2 py-2 text-[11px] font-semibold text-[var(--bn-primary)] hover:bg-[var(--bn-primary-container)]/20"
          >
            Aplicar cores aos elementos
          </button>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
          Tipografia
        </p>
        <p className="text-[11px] text-[var(--bn-muted)]">
          Variantes prontas para títulos (display) e corpo.
        </p>
        <div className="grid gap-1">
          {TYPOGRAPHY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.hint}
              onClick={() =>
                onChange({
                  ...t,
                  fontDisplay: preset.theme.fontDisplay,
                  fontBody: preset.theme.fontBody,
                })
              }
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-left",
                activeTypo === preset.id
                  ? "border-[var(--bn-primary)]/60 bg-[var(--bn-primary-container)]/15"
                  : "border-[var(--bn-border)] bg-[var(--bn-hover)] hover:border-[var(--bn-border)]",
              )}
            >
              <span className="block text-xs text-[var(--bn-on)]">{preset.label}</span>
              <span className="block text-[10px] text-[var(--bn-muted)]">{preset.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ElementInspector({
  element,
  artboardSize,
  onChange,
  onDelete,
  onDuplicate,
  onBringFront,
  onSendBack,
  className,
}: {
  element: CanvasElement | null;
  artboardSize: { width: number; height: number };
  onChange: (next: CanvasElement) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringFront: () => void;
  onSendBack: () => void;
  className?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!element) {
    return (
      <aside
        className={cn(
          "flex w-64 shrink-0 flex-col border-l border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] p-4 text-sm text-[var(--bn-muted)]",
          className,
        )}
      >
        Selecione um elemento no canvas.
      </aside>
    );
  }

  const p = element.props ?? {};
  const input =
    "mt-1 w-full rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface-container)] px-2 py-1.5 text-sm text-[var(--bn-on)]";
  const stylePresets = stylePresetsForType(element.type);
  const mediaAccept = CANVAS_MEDIA_ACCEPT;

  function setProp(key: string, value: unknown) {
    onChange({
      ...element!,
      props: { ...element!.props, [key]: value },
    } as CanvasElement);
  }

  function applyAlign(align: ArtboardAlign) {
    onChange({
      ...element!,
      frame: alignFrameToArtboard(element!.frame, artboardSize, align),
    });
  }

  function snapSelected() {
    onChange({
      ...element!,
      frame: snapFrameToGrid(element!.frame),
    });
  }

  async function uploadMedia(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const body = new FormData();
      body.set("kind", "canvas");
      body.set("file", file);
      const res = await fetch("/api/admin/organization/brand-asset", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as { message?: string; url?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.message ?? "Falha no upload.");
      }
      setProp("mediaUrl", data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro no upload.");
    } finally {
      setUploading(false);
    }
  }

  function renderMediaUploadBlock(opts?: { title?: string; hint?: string }) {
    const title = opts?.title ?? "Arquivo do dispositivo";
    const hint =
      opts?.hint ??
      "JPEG, PNG, WebP (até 20 MB) ou MP4/WebM (até 40 MB).";
    const url = p.mediaUrl ?? "";
    const isVideo = isCanvasVideoUrl(url);

    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--bn-on-variant)]">{title}</p>
        {url && !isVideo ? renderMediaCropControls() : null}
        {url && isVideo ? (
          <video
            src={url}
            className="max-h-28 w-full rounded-lg border border-[var(--bn-border)] object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : null}
        {!url ? (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-[var(--bn-border)] text-[11px] text-[var(--bn-muted)]">
            Nenhum arquivo
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept={mediaAccept}
          className="sr-only"
          tabIndex={-1}
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadMedia(f);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-lg bg-[var(--bn-primary-container)] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--bn-primary-container)] disabled:opacity-50"
        >
          {uploading
            ? "Enviando…"
            : url
              ? "Trocar arquivo"
              : "Carregar do dispositivo"}
        </button>

        {url ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => setProp("mediaUrl", "")}
            className="w-full rounded-lg border border-[var(--bn-border)] px-3 py-1.5 text-[11px] text-[var(--bn-on-variant)] hover:border-[var(--bn-border)] hover:text-[var(--bn-on)] disabled:opacity-50"
          >
            Remover mídia
          </button>
        ) : null}

        <p className="text-[10px] leading-relaxed text-[var(--bn-muted)]">{hint}</p>

        {uploadError ? (
          <p className="text-[11px] text-rose-700">{uploadError}</p>
        ) : null}

        <details className="rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface-container)]/40 px-2 py-1.5">
          <summary className="cursor-pointer text-[11px] text-[var(--bn-muted)] hover:text-[var(--bn-on-variant)]">
            Ou usar link externo
          </summary>
          <label className="mt-2 block text-xs text-[var(--bn-on-variant)]">
            URL
            <input
              className={cn(input, "mt-1")}
              value={url}
              placeholder="https://…"
              onChange={(e) => setProp("mediaUrl", e.target.value)}
            />
          </label>
        </details>

        {url && isVideo ? (
          <p className="text-[10px] text-[var(--bn-muted)]">
            Zoom e posição valem para fotos. Em vídeo, o quadro usa cobertura
            automática.
          </p>
        ) : null}
      </div>
    );
  }

  function renderMediaCropControls() {
    const el = element!;
    const url = p.mediaUrl ?? "";
    const zoom = typeof p.mediaZoom === "number" ? p.mediaZoom : 1;
    const posX = typeof p.mediaPosX === "number" ? p.mediaPosX : 50;
    const posY = typeof p.mediaPosY === "number" ? p.mediaPosY : 50;
    const frameAspect =
      el.frame.w > 0 && el.frame.h > 0
        ? `${el.frame.w} / ${el.frame.h}`
        : "16 / 10";
    const mediaStyle = {
      objectFit: "cover" as const,
      objectPosition: `${posX}% ${posY}%`,
      transform: zoom > 1 ? `scale(${zoom})` : undefined,
      transformOrigin: `${posX}% ${posY}%`,
    };

    return (
      <div className="space-y-3 rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface-container)]/50 p-3">
        {/*
          Prévia sticky: no mobile o sheet cobre o canvas; o usuário precisa
          ver o enquadramento aqui enquanto mexe nos sliders.
        */}
        <div className="sticky top-0 z-[1] -mx-1 space-y-1.5 bg-[var(--bn-surface-container)] px-1 pb-2 pt-0.5 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
            Prévia no quadro
          </p>
          <div
            className="relative w-full overflow-hidden rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface-low)] shadow-inner"
            style={{ aspectRatio: frameAspect, maxHeight: "42vh" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="absolute inset-0 h-full w-full"
              style={mediaStyle}
              draggable={false}
            />
          </div>
          <p className="text-[10px] leading-relaxed text-[var(--bn-muted)] lg:hidden">
            Ajuste zoom e posição abaixo — a prévia atualiza na hora (o canvas
            fica atrás deste painel no celular).
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--bn-on)]">
            Enquadramento da foto
          </p>
          <p className="mt-0.5 hidden text-[10px] leading-relaxed text-[var(--bn-muted)] lg:block">
            Aumente o zoom e arraste os eixos para mostrar a parte certa da
            imagem no quadro.
          </p>
        </div>

        <label className="block text-[11px] text-[var(--bn-on-variant)]">
          <span className="flex items-center justify-between gap-2">
            Zoom
            <span className="tabular-nums text-[var(--bn-muted)]">
              {Math.round(zoom * 100)}%
            </span>
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            className="mt-1.5 h-8 w-full accent-[var(--bn-primary-container)]"
            aria-label="Zoom da foto"
            onChange={(e) => setProp("mediaZoom", Number(e.target.value))}
          />
        </label>

        <label className="block text-[11px] text-[var(--bn-on-variant)]">
          <span className="flex items-center justify-between gap-2">
            Posição horizontal
            <span className="tabular-nums text-[var(--bn-muted)]">
              {Math.round(posX)}%
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={posX}
            className="mt-1.5 h-8 w-full accent-[var(--bn-primary-container)]"
            aria-label="Posição horizontal da foto"
            onChange={(e) => setProp("mediaPosX", Number(e.target.value))}
          />
        </label>

        <label className="block text-[11px] text-[var(--bn-on-variant)]">
          <span className="flex items-center justify-between gap-2">
            Posição vertical
            <span className="tabular-nums text-[var(--bn-muted)]">
              {Math.round(posY)}%
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={posY}
            className="mt-1.5 h-8 w-full accent-[var(--bn-primary-container)]"
            aria-label="Posição vertical da foto"
            onChange={(e) => setProp("mediaPosY", Number(e.target.value))}
          />
        </label>

        <button
          type="button"
          onClick={() => {
            setProp("mediaZoom", 1);
            setProp("mediaPosX", 50);
            setProp("mediaPosY", 50);
          }}
          className="w-full rounded-lg border border-[var(--bn-border)] px-3 py-1.5 text-[11px] text-[var(--bn-on-variant)] hover:border-[var(--bn-border)] hover:text-[var(--bn-on)]"
        >
          Redefinir enquadramento
        </button>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "flex w-64 shrink-0 flex-col gap-3 overflow-y-auto border-l border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] p-4",
        className,
      )}
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
          {ELEMENT_TYPE_LABEL[element.type] ?? element.type}
        </p>
        <p className="text-sm font-medium text-[var(--bn-on)]">Editar conteúdo</p>
      </div>

      {stylePresets.length ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
            Estilo pronto
          </p>
          <div className="flex flex-wrap gap-1">
            {stylePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                title={preset.hint}
                onClick={() => onChange(applyStylePreset(element, preset))}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px]",
                  p.variant === preset.id
                    ? "border-[var(--bn-primary)] bg-[var(--bn-primary-container)]/20 text-[var(--bn-primary)]"
                    : "border-[var(--bn-border)] text-[var(--bn-on-variant)] hover:border-[var(--bn-border)] hover:text-[var(--bn-on)]",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {(element.type === "text" || element.type === "button") && (
        <>
          <label className="text-xs text-[var(--bn-on-variant)]">
            Texto
            <textarea
              className={input}
              rows={3}
              value={p.text ?? ""}
              onChange={(e) => setProp("text", e.target.value)}
            />
          </label>
          <label className="text-xs text-[var(--bn-on-variant)]">
            Tamanho
            <input
              type="number"
              className={input}
              value={p.fontSize ?? 16}
              onChange={(e) => setProp("fontSize", Number(e.target.value))}
            />
          </label>
          <div className="text-xs text-[var(--bn-on-variant)]">
            Cor
            <ColorWheelField
              aria-label="Cor do texto"
              fallback="#fafafa"
              value={p.color?.startsWith("#") ? p.color : "#fafafa"}
              onChange={(hex) => setProp("color", hex)}
              className={cn(input, "mt-1 h-9 w-full")}
            />
          </div>
        </>
      )}

      {element.type === "button" && (
        <>
          <label className="text-xs text-[var(--bn-on-variant)]">
            Link (book = agendar)
            <input
              className={input}
              value={p.href ?? "book"}
              onChange={(e) => setProp("href", e.target.value)}
            />
          </label>
          <div className="text-xs text-[var(--bn-on-variant)]">
            Fundo
            <ColorWheelField
              aria-label="Cor de fundo do botão"
              fallback="#3b82f6"
              value={
                p.backgroundColor?.startsWith("#")
                  ? p.backgroundColor
                  : "#3b82f6"
              }
              onChange={(hex) => setProp("backgroundColor", hex)}
              className={cn(input, "mt-1 h-9 w-full")}
            />
          </div>
        </>
      )}

      {(element.type === "image" || element.type === "media") &&
        renderMediaUploadBlock({
          title: "Imagem ou vídeo",
          hint: "Escolha um arquivo no celular ou PC. JPEG/PNG/WebP até 20 MB; MP4/WebM até 40 MB.",
        })}

      {element.type === "rect" && (
        <div className="text-xs text-[var(--bn-on-variant)]">
          Fundo
          <ColorWheelField
            aria-label="Cor de fundo do bloco"
            fallback="#18181b"
            value={
              p.backgroundColor?.startsWith("#") ? p.backgroundColor : "#18181b"
            }
            onChange={(hex) => setProp("backgroundColor", hex)}
            className={cn(input, "mt-1 h-9 w-full")}
          />
        </div>
      )}

      {(element.type === "services" ||
        element.type === "team" ||
        element.type === "contact") && (
        <div className="space-y-2">
          <label className="text-xs text-[var(--bn-on-variant)]">
            Título
            <input
              className={input}
              value={p.title ?? ""}
              onChange={(e) => setProp("title", e.target.value)}
            />
          </label>
          {element.type === "services" ? (
            <p className="text-[11px] leading-relaxed text-[var(--bn-muted)]">
              Preço e badge seguem <span className="text-[var(--bn-on-variant)]">Principal</span>.
              Fundo do card: <span className="text-[var(--bn-on-variant)]">Superfície</span>. Título:
              <span className="text-[var(--bn-on-variant)]"> Texto</span>. Ajuste em Cores do sistema.
            </p>
          ) : null}
        </div>
      )}

      {element.type === "footer" && (
        <label className="flex items-center gap-2 text-xs text-[var(--bn-on-variant)]">
          <input
            type="checkbox"
            checked={p.showPitch !== false}
            onChange={(e) => setProp("showPitch", e.target.checked)}
          />
          Mostrar frase de apoio
        </label>
      )}

      {(element.type === "hero" || element.type === "panel") && (
        <div className="space-y-2">
          {element.type === "hero" ? (
            <label className="text-xs text-[var(--bn-on-variant)]">
              Eyebrow
              <input
                className={input}
                value={p.eyebrow ?? ""}
                onChange={(e) => setProp("eyebrow", e.target.value)}
              />
            </label>
          ) : null}
          <label className="text-xs text-[var(--bn-on-variant)]">
            Título
            <input
              className={input}
              value={p.title ?? ""}
              onChange={(e) => setProp("title", e.target.value)}
            />
          </label>
          <label className="text-xs text-[var(--bn-on-variant)]">
            Descrição
            <textarea
              className={input}
              rows={2}
              value={p.description ?? ""}
              onChange={(e) => setProp("description", e.target.value)}
            />
          </label>
          {element.type === "hero" ? (
            <>
              <label className="text-xs text-[var(--bn-on-variant)]">
                Texto do CTA
                <input
                  className={input}
                  value={p.ctaLabel ?? ""}
                  onChange={(e) => setProp("ctaLabel", e.target.value)}
                />
              </label>
              <label className="text-xs text-[var(--bn-on-variant)]">
                Escurecer fundo
                <input
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  className={input}
                  value={p.overlay ?? 0.45}
                  onChange={(e) => setProp("overlay", Number(e.target.value))}
                  title="0 = claro · 1 = bem escuro sobre a foto"
                />
              </label>
              {renderMediaUploadBlock({
                title: "Fundo (imagem ou vídeo)",
                hint: "Carregue do dispositivo. Vídeo toca em loop, sem som.",
              })}
            </>
          ) : null}
          <div className="text-xs text-[var(--bn-on-variant)]">
            Fundo
            <ColorWheelField
              aria-label="Cor de fundo do painel"
              fallback="#18181b"
              value={
                p.backgroundColor?.startsWith("#")
                  ? p.backgroundColor
                  : "#18181b"
              }
              onChange={(hex) => setProp("backgroundColor", hex)}
              className={cn(input, "mt-1 h-9 w-full")}
            />
          </div>
        </div>
      )}

      {element.type === "grid" && (
        <div className="space-y-2">
          <label className="text-xs text-[var(--bn-on-variant)]">
            Título
            <input
              className={input}
              value={p.title ?? ""}
              onChange={(e) => setProp("title", e.target.value)}
            />
          </label>
          <label className="text-xs text-[var(--bn-on-variant)]">
            Colunas
            <select
              className={input}
              value={p.gridCols ?? 3}
              onChange={(e) =>
                setProp("gridCols", Number(e.target.value) as 1 | 2 | 3 | 4)
              }
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          <p className="text-[11px] text-[var(--bn-muted)]">
            Cartões (título | descrição, um por linha)
          </p>
          <textarea
            className={input}
            rows={5}
            value={(p.cards ?? [])
              .map((c) => `${c.title}|${c.description ?? ""}`)
              .join("\n")}
            onChange={(e) => {
              const cards = e.target.value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [title, ...rest] = line.split("|");
                  return {
                    title: (title || "Item").trim(),
                    description: rest.join("|").trim() || undefined,
                    emoji: "•",
                  };
                });
              setProp("cards", cards);
            }}
          />
        </div>
      )}

      {element.type === "divider" && (
        <>
          <div className="text-xs text-[var(--bn-on-variant)]">
            Cor
            <ColorWheelField
              aria-label="Cor do divisor"
              fallback="#3f3f46"
              value={p.color?.startsWith("#") ? p.color : "#3f3f46"}
              onChange={(hex) => setProp("color", hex)}
              className={cn(input, "mt-1 h-9 w-full")}
            />
          </div>
          <label className="text-xs text-[var(--bn-on-variant)]">
            Espessura
            <input
              type="number"
              className={input}
              value={p.thickness ?? 1}
              onChange={(e) => setProp("thickness", Number(e.target.value))}
            />
          </label>
        </>
      )}

      {element.type === "badge" && (
        <>
          <label className="text-xs text-[var(--bn-on-variant)]">
            Texto
            <input
              className={input}
              value={p.text ?? ""}
              onChange={(e) => setProp("text", e.target.value)}
            />
          </label>
          <div className="text-xs text-[var(--bn-on-variant)]">
            Fundo
            <ColorWheelField
              aria-label="Cor de fundo do badge"
              fallback="#3b82f6"
              value={
                p.backgroundColor?.startsWith("#")
                  ? p.backgroundColor
                  : "#3b82f6"
              }
              onChange={(hex) => setProp("backgroundColor", hex)}
              className={cn(input, "mt-1 h-9 w-full")}
            />
          </div>
        </>
      )}

      <div className="mt-1 flex flex-col gap-1.5">
        <button
          type="button"
          className="rounded-lg border border-[var(--bn-border)] px-2 py-1.5 text-xs text-[var(--bn-on)] hover:bg-[var(--bn-hover)]"
          onClick={onDuplicate}
        >
          Duplicar
        </button>
        <button
          type="button"
          className="rounded-lg border border-rose-500/40 px-2 py-1.5 text-xs text-[var(--bn-status-danger)] hover:bg-rose-500/10"
          onClick={onDelete}
        >
          Excluir
        </button>
      </div>

      <details className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-container)]/40 open:bg-[var(--bn-surface-container)]/60">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold text-[var(--bn-on)] marker:content-none [&::-webkit-details-marker]:hidden">
          Posição e tamanho
          <span className="mt-0.5 block text-[10px] font-normal text-[var(--bn-muted)]">
            Avançado — posição, tamanho, grade e ordem
          </span>
        </summary>
        <div className="space-y-3 border-t border-[var(--bn-border)] px-3 pb-3 pt-2">
          <p className="text-[11px] text-[var(--bn-muted)]">
            Ordem (frente/atrás): {element.zIndex}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(
              [
                ["x", "Esquerda (X)"],
                ["y", "Topo (Y)"],
                ["w", "Largura"],
                ["h", "Altura"],
              ] as const
            ).map(([k, label]) => (
              <label
                key={k}
                className="text-[var(--bn-on-variant)]"
                title={label}
              >
                {label}
                <input
                  type="number"
                  step={CANVAS_SNAP_GRID}
                  className={input}
                  value={element.frame[k]}
                  onChange={(e) =>
                    onChange({
                      ...element,
                      frame: {
                        ...element.frame,
                        [k]: Number(e.target.value) || 0,
                      },
                    })
                  }
                  onBlur={(e) =>
                    onChange({
                      ...element,
                      frame: snapFrameToGrid({
                        ...element.frame,
                        [k]: Number(e.target.value) || 0,
                      }),
                    })
                  }
                />
              </label>
            ))}
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
              Grade e alinhamento
            </p>
            <button
              type="button"
              onClick={snapSelected}
              className="w-full rounded-lg border border-[var(--bn-primary)]/40 bg-[var(--bn-primary-container)]/10 px-2 py-1.5 text-[11px] font-medium text-[var(--bn-primary)] hover:bg-[var(--bn-primary-container)]/20"
            >
              Alinhar à grade ({CANVAS_SNAP_GRID}px)
            </button>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ["left", "←"],
                  ["centerX", "↔"],
                  ["right", "→"],
                  ["top", "↑"],
                  ["centerY", "↕"],
                  ["bottom", "↓"],
                ] as const
              ).map(([align, label]) => (
                <button
                  key={align}
                  type="button"
                  title={align}
                  onClick={() => applyAlign(align)}
                  className="rounded-md border border-[var(--bn-border)] px-1 py-1 text-[11px] text-[var(--bn-on-variant)] hover:border-[var(--bn-border)] hover:bg-[var(--bn-hover)]"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[var(--bn-on-variant)]">
            <input
              type="checkbox"
              checked={Boolean(element.locked)}
              onChange={(e) =>
                onChange({ ...element, locked: e.target.checked })
              }
            />
            Bloquear posição
          </label>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              className="rounded-lg border border-[var(--bn-border)] px-2 py-1.5 text-xs text-[var(--bn-on)] hover:bg-[var(--bn-hover)]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBringFront();
              }}
            >
              Trazer à frente
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--bn-border)] px-2 py-1.5 text-xs text-[var(--bn-on)] hover:bg-[var(--bn-hover)]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSendBack();
              }}
            >
              Enviar para trás
            </button>
          </div>
        </div>
      </details>
    </aside>
  );
}

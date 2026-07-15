"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  useState,
} from "react";

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
  snapFrameToGrid,
  snapToGrid,
  type ArtboardAlign,
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
}: Props) {
  const board = canvas.artboards[artboard];
  const elements = elementsForArtboard(canvas, artboard);
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.55);
  const drag = useRef<DragMode | null>(null);

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
        updateElement(selectedId, {
          frame: {
            ...el.frame,
            x: snap(mode.ox + dx),
            y: snap(mode.oy + dy),
          },
        });
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
      updateElement(selectedId, { frame: f });
    },
    [canvas.elements, selectedId, updateElement, zoom],
  );

  const endDrag = useCallback(() => {
    drag.current = null;
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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-900">
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2 text-xs text-zinc-400">
        <span>Zoom</span>
        <input
          type="range"
          min={0.25}
          max={1.2}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-32"
        />
        <span>{Math.round(zoom * 100)}%</span>
        <span className="ml-auto text-zinc-500">
          {board.width}×{board.height}px · clique para selecionar · arraste para mover
        </span>
      </div>
      <div
        className="min-h-0 flex-1 overflow-auto p-8"
        onClick={() => onSelect(null)}
      >
        <div
          ref={stageRef}
          className="relative mx-auto origin-top shadow-2xl shadow-black/60 ring-1 ring-white/10"
          style={{
            ...canvasThemeStyle(canvas.theme, org.primaryColor),
            width: board.width,
            height: board.height,
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
          }}
        >
          {/* Guias só do editor — somem quando há arte de fundo ativa. */}
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
          {elements.map((el) => {
            const selected = el.id === selectedId;
            return (
              <div
                key={el.id}
                className={cn(
                  "absolute outline-offset-0",
                  selected && "outline outline-2 outline-brand-400 ring-1 ring-brand-400/40",
                  el.locked && "pointer-events-none opacity-70",
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
                          "absolute z-10 h-3 w-3 rounded-sm border border-brand-300 bg-brand-500",
                          h === "nw" && "-left-1.5 -top-1.5 cursor-nwse-resize",
                          h === "n" && "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
                          h === "ne" && "-right-1.5 -top-1.5 cursor-nesw-resize",
                          h === "e" && "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
                          h === "se" && "-bottom-1.5 -right-1.5 cursor-nwse-resize",
                          h === "s" && "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
                          h === "sw" && "-bottom-1.5 -left-1.5 cursor-nesw-resize",
                          h === "w" && "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
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
  );
}

type LibraryTab = "elements" | "sections" | "ready";

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-[1] max-h-[min(90vh,720px)] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Modelos de página
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-wide text-white">
              Escolha um layout completo
            </h2>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">
              Cada modelo tem composição, cores e tipografia próprias. Aplicar
              substitui o canvas atual (desktop + mobile).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300 hover:bg-white/5"
          >
            Fechar
          </button>
        </div>
        <div className="grid max-h-[min(70vh,560px)] gap-3 overflow-y-auto p-5 sm:grid-cols-2">
          {PAGE_TEMPLATE_META.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              disabled={busy}
              onClick={() => onPick(tpl.id)}
              className="group rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-brand-500/40 hover:bg-brand-500/10 disabled:opacity-50"
            >
              <div
                className="mb-3 h-16 overflow-hidden rounded-lg border border-white/10"
                style={{
                  background: `linear-gradient(135deg, ${tpl.swatch} 0%, #09090b 72%)`,
                }}
              >
                <div className="flex h-full items-end p-2">
                  <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80">
                    {tpl.vibe}
                  </span>
                </div>
              </div>
              <p className="text-sm font-semibold text-zinc-100 group-hover:text-white">
                {tpl.label}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                {tpl.tagline}
              </p>
              <p className="mt-2 font-mono text-[10px] text-zinc-600">
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
}: {
  artboard: CanvasArtboardId;
  boardW: number;
  atY: number;
  onAdd: (el: CanvasElement) => void;
  onAddMany: (els: CanvasElement[]) => void;
}) {
  const [tab, setTab] = useState<LibraryTab>("elements");

  function addSection(id: PremadeSectionId) {
    onAddMany(createPremadeSection(id, artboard, boardW, atY));
  }

  return (
    <aside className="flex h-full min-h-0 flex-col gap-2 overflow-hidden p-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Biblioteca
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          Solta em Y≈{Math.round(atY)} no arteboard {artboard}.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-white/10 p-0.5">
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
                ? "bg-brand-500 text-zinc-950"
                : "text-zinc-400 hover:bg-white/5",
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
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {group.title}
              </p>
              <div className="grid gap-1">
                {group.items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    title={item.hint}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-brand-500/40 hover:bg-brand-500/10"
                    onClick={() =>
                      onAdd(
                        createLibraryElement(item.type, artboard, boardW, atY),
                      )
                    }
                  >
                    <span className="block text-sm text-zinc-100">
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-zinc-500">
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
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Seções pré-montadas
            </p>
            <p className="text-[11px] text-zinc-500">
              Insere vários elementos de uma vez, já posicionados.
            </p>
            <div className="grid gap-1">
              {PREMADE_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  title={s.hint}
                  className="rounded-lg border border-brand-500/25 bg-brand-500/5 px-3 py-2 text-left hover:border-brand-500/50 hover:bg-brand-500/15"
                  onClick={() => addSection(s.id)}
                >
                  <span className="block text-sm text-zinc-100">{s.label}</span>
                  <span className="block text-[10px] text-zinc-500">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "ready" ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Faixas e blocos
              </p>
              <p className="text-[11px] text-zinc-500">
                Formas sólidas como a faixa azul larga da marca.
              </p>
              <div className="grid gap-1">
                {RECT_STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.hint}
                    className="rounded-lg border border-brand-500/25 bg-brand-500/5 px-3 py-2 text-left hover:border-brand-500/50 hover:bg-brand-500/15"
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
                    <span className="block text-sm text-zinc-100">
                      {preset.label}
                    </span>
                    <span className="block text-[10px] text-zinc-500">
                      {preset.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Cards / painéis
              </p>
              <div className="grid gap-1">
                {PANEL_STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.hint}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-brand-500/40"
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
                    <span className="block text-sm text-zinc-100">
                      {preset.label}
                    </span>
                    <span className="block text-[10px] text-zinc-500">
                      {preset.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Tipos de botão
              </p>
              <div className="grid gap-1">
                {BUTTON_STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.hint}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-brand-500/40"
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
                    <span className="block text-sm text-zinc-100">
                      {preset.label}
                    </span>
                    <span className="block text-[10px] text-zinc-500">
                      {preset.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
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
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-zinc-100 hover:border-brand-500/40"
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
}: {
  theme: SiteCanvasConfig["theme"];
  onChange: (theme: NonNullable<SiteCanvasConfig["theme"]>) => void;
  onBindElements?: () => void;
}) {
  const t = theme ?? {};
  const row =
    "mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100";

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
    <div className="max-h-[42vh] space-y-3 overflow-y-auto border-b border-white/10 px-3 pb-3">
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Cores do sistema
        </p>
        <p className="text-[11px] leading-relaxed text-zinc-500">
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
          <label
            key={key}
            className="flex items-center justify-between gap-2 text-xs text-zinc-400"
          >
            <span>{label}</span>
            <input
              type="color"
              className={cn(row, "h-8 w-14 shrink-0 p-0.5")}
              value={
                (t[key] as string | undefined)?.startsWith("#")
                  ? (t[key] as string)
                  : fallback
              }
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}

        <div className="pt-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Arte de fundo
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
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
                      ? "border-brand-400 ring-1 ring-brand-400/50"
                      : "border-white/10 hover:border-white/25",
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
                  <span className="block px-1.5 py-1 text-[10px] font-medium text-zinc-300">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          {(t.bgArt ?? "none") !== "none" ? (
            <div className="mt-2 space-y-2 rounded-lg border border-white/10 bg-zinc-900/40 p-2">
              <label className="flex items-center justify-between gap-2 text-xs text-zinc-400">
                <span>Cor das linhas</span>
                <input
                  type="color"
                  className={cn(row, "h-8 w-14 shrink-0 p-0.5")}
                  value={
                    t.bgArtColor?.startsWith("#")
                      ? t.bgArtColor
                      : t.primary?.startsWith("#")
                        ? t.primary
                        : "#a1a1aa"
                  }
                  onChange={(e) => set("bgArtColor", e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-xs text-zinc-400">
                <span className="flex justify-between">
                  Intensidade
                  <span className="text-zinc-500">{t.bgArtStrength ?? 45}%</span>
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
            className="mt-1 w-full rounded-lg border border-brand-500/40 bg-brand-500/10 px-2 py-2 text-[11px] font-semibold text-brand-200 hover:bg-brand-500/20"
          >
            Aplicar cores aos elementos
          </button>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Tipografia
        </p>
        <p className="text-[11px] text-zinc-500">
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
                  ? "border-brand-500/60 bg-brand-500/15"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25",
              )}
            >
              <span className="block text-xs text-zinc-100">{preset.label}</span>
              <span className="block text-[10px] text-zinc-500">{preset.hint}</span>
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
}: {
  element: CanvasElement | null;
  artboardSize: { width: number; height: number };
  onChange: (next: CanvasElement) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringFront: () => void;
  onSendBack: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!element) {
    return (
      <aside className="flex w-64 shrink-0 flex-col border-l border-white/10 bg-zinc-950 p-4 text-sm text-zinc-500">
        Selecione um elemento no canvas.
      </aside>
    );
  }

  const p = element.props ?? {};
  const input =
    "mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100";
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
      "JPEG, PNG, WebP (até 6 MB) ou MP4/WebM (até 40 MB).";
    const url = p.mediaUrl ?? "";
    const isVideo = isCanvasVideoUrl(url);

    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-300">{title}</p>
        {url ? (
          isVideo ? (
            <video
              src={url}
              className="max-h-28 w-full rounded-lg border border-white/10 object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="max-h-28 w-full rounded-lg border border-white/10 object-cover"
            />
          )
        ) : (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-white/15 text-[11px] text-zinc-500">
            Nenhum arquivo
          </div>
        )}

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
          className="w-full rounded-lg bg-brand-500 px-3 py-2.5 text-sm font-semibold text-brand-950 transition hover:bg-brand-400 disabled:opacity-50"
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
            className="w-full rounded-lg border border-white/15 px-3 py-1.5 text-[11px] text-zinc-400 hover:border-white/30 hover:text-zinc-200 disabled:opacity-50"
          >
            Remover mídia
          </button>
        ) : null}

        <p className="text-[10px] leading-relaxed text-zinc-500">{hint}</p>

        {uploadError ? (
          <p className="text-[11px] text-rose-300">{uploadError}</p>
        ) : null}

        <details className="rounded-lg border border-white/10 bg-zinc-900/40 px-2 py-1.5">
          <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-300">
            Ou usar link externo
          </summary>
          <label className="mt-2 block text-xs text-zinc-400">
            URL
            <input
              className={input}
              value={url}
              onChange={(e) => setProp("mediaUrl", e.target.value)}
              placeholder="https://…"
            />
          </label>
        </details>
      </div>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/10 bg-zinc-950 p-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          {element.type}
        </p>
        <p className="truncate text-xs text-zinc-600">{element.id}</p>
        <p className="mt-1 text-[11px] text-zinc-500">Camada z-index: {element.zIndex}</p>
      </div>

      {stylePresets.length ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
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
                    ? "border-brand-500 bg-brand-500/20 text-brand-200"
                    : "border-white/15 text-zinc-400 hover:border-white/30 hover:text-zinc-200",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 text-xs">
        {(["x", "y", "w", "h"] as const).map((k) => (
          <label key={k} className="text-zinc-400">
            {k.toUpperCase()}
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
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Grade e alinhamento
        </p>
        <button
          type="button"
          onClick={snapSelected}
          className="w-full rounded-lg border border-brand-500/40 bg-brand-500/10 px-2 py-1.5 text-[11px] font-medium text-brand-200 hover:bg-brand-500/20"
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
              className="rounded-md border border-white/15 px-1 py-1 text-[11px] text-zinc-300 hover:border-white/30 hover:bg-white/5"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {(element.type === "text" || element.type === "button") && (
        <>
          <label className="text-xs text-zinc-400">
            Texto
            <textarea
              className={input}
              rows={3}
              value={p.text ?? ""}
              onChange={(e) => setProp("text", e.target.value)}
            />
          </label>
          <label className="text-xs text-zinc-400">
            Tamanho
            <input
              type="number"
              className={input}
              value={p.fontSize ?? 16}
              onChange={(e) => setProp("fontSize", Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-zinc-400">
            Cor
            <input
              type="color"
              className={cn(input, "h-9")}
              value={p.color?.startsWith("#") ? p.color : "#fafafa"}
              onChange={(e) => setProp("color", e.target.value)}
            />
          </label>
        </>
      )}

      {element.type === "button" && (
        <>
          <label className="text-xs text-zinc-400">
            Link (book = agendar)
            <input
              className={input}
              value={p.href ?? "book"}
              onChange={(e) => setProp("href", e.target.value)}
            />
          </label>
          <label className="text-xs text-zinc-400">
            Fundo
            <input
              type="color"
              className={cn(input, "h-9")}
              value={
                p.backgroundColor?.startsWith("#")
                  ? p.backgroundColor
                  : "#3b82f6"
              }
              onChange={(e) => setProp("backgroundColor", e.target.value)}
            />
          </label>
        </>
      )}

      {(element.type === "image" || element.type === "media") &&
        renderMediaUploadBlock({
          title: "Imagem ou vídeo",
          hint: "Escolha um arquivo no celular ou PC. JPEG/PNG/WebP até 6 MB; MP4/WebM até 40 MB.",
        })}

      {element.type === "rect" && (
        <label className="text-xs text-zinc-400">
          Fundo
          <input
            type="color"
            className={cn(input, "h-9")}
            value={
              p.backgroundColor?.startsWith("#") ? p.backgroundColor : "#18181b"
            }
            onChange={(e) => setProp("backgroundColor", e.target.value)}
          />
        </label>
      )}

      {(element.type === "services" ||
        element.type === "team" ||
        element.type === "contact") && (
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">
            Título
            <input
              className={input}
              value={p.title ?? ""}
              onChange={(e) => setProp("title", e.target.value)}
            />
          </label>
          {element.type === "services" ? (
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Preço e badge seguem <span className="text-zinc-300">Principal</span>.
              Fundo do card: <span className="text-zinc-300">Superfície</span>. Título:
              <span className="text-zinc-300"> Texto</span>. Ajuste em Cores do sistema.
            </p>
          ) : null}
        </div>
      )}

      {element.type === "footer" && (
        <label className="flex items-center gap-2 text-xs text-zinc-300">
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
            <label className="text-xs text-zinc-400">
              Eyebrow
              <input
                className={input}
                value={p.eyebrow ?? ""}
                onChange={(e) => setProp("eyebrow", e.target.value)}
              />
            </label>
          ) : null}
          <label className="text-xs text-zinc-400">
            Título
            <input
              className={input}
              value={p.title ?? ""}
              onChange={(e) => setProp("title", e.target.value)}
            />
          </label>
          <label className="text-xs text-zinc-400">
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
              <label className="text-xs text-zinc-400">
                Texto do CTA
                <input
                  className={input}
                  value={p.ctaLabel ?? ""}
                  onChange={(e) => setProp("ctaLabel", e.target.value)}
                />
              </label>
              <label className="text-xs text-zinc-400">
                Overlay (0–1)
                <input
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  className={input}
                  value={p.overlay ?? 0.45}
                  onChange={(e) => setProp("overlay", Number(e.target.value))}
                />
              </label>
              {renderMediaUploadBlock({
                title: "Fundo (imagem ou vídeo)",
                hint: "Carregue do dispositivo. Vídeo toca em loop, sem som.",
              })}
            </>
          ) : null}
          <label className="text-xs text-zinc-400">
            Fundo
            <input
              type="color"
              className={cn(input, "h-9")}
              value={
                p.backgroundColor?.startsWith("#")
                  ? p.backgroundColor
                  : "#18181b"
              }
              onChange={(e) => setProp("backgroundColor", e.target.value)}
            />
          </label>
        </div>
      )}

      {element.type === "grid" && (
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">
            Título
            <input
              className={input}
              value={p.title ?? ""}
              onChange={(e) => setProp("title", e.target.value)}
            />
          </label>
          <label className="text-xs text-zinc-400">
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
          <p className="text-[11px] text-zinc-500">
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
          <label className="text-xs text-zinc-400">
            Cor
            <input
              type="color"
              className={cn(input, "h-9")}
              value={p.color?.startsWith("#") ? p.color : "#3f3f46"}
              onChange={(e) => setProp("color", e.target.value)}
            />
          </label>
          <label className="text-xs text-zinc-400">
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
          <label className="text-xs text-zinc-400">
            Texto
            <input
              className={input}
              value={p.text ?? ""}
              onChange={(e) => setProp("text", e.target.value)}
            />
          </label>
          <label className="text-xs text-zinc-400">
            Fundo
            <input
              type="color"
              className={cn(input, "h-9")}
              value={
                p.backgroundColor?.startsWith("#")
                  ? p.backgroundColor
                  : "#3b82f6"
              }
              onChange={(e) => setProp("backgroundColor", e.target.value)}
            />
          </label>
        </>
      )}

      <label className="flex items-center gap-2 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={Boolean(element.locked)}
          onChange={(e) => onChange({ ...element, locked: e.target.checked })}
        />
        Bloquear posição
      </label>

      <div className="mt-2 flex flex-col gap-1.5">
        <button
          type="button"
          className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
          onClick={onDuplicate}
        >
          Duplicar
        </button>
        <button
          type="button"
          className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
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
          className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSendBack();
          }}
        >
          Enviar para trás
        </button>
        <button
          type="button"
          className="rounded-lg border border-rose-500/40 px-2 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10"
          onClick={onDelete}
        >
          Excluir
        </button>
      </div>
    </aside>
  );
}

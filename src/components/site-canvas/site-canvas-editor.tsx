"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CanvasConfirmModal } from "@/components/site-canvas/canvas-confirm-modal";
import { CanvasLayersPanel } from "@/components/site-canvas/canvas-layers-panel";
import { CanvasOnboarding } from "@/components/site-canvas/canvas-onboarding";
import { CanvasPhonePreview } from "@/components/site-canvas/canvas-phone-preview";
import {
  CanvasStage,
  ELEMENT_TYPE_LABEL,
  ElementInspector,
  ElementLibrary,
  PageTemplatePicker,
  ThemePanel,
} from "@/components/site-canvas/canvas-studio-parts";
import { nextArtboardY } from "@/lib/canvas-presets";
import {
  alignFrameToArtboard,
  CANVAS_SNAP_GRID,
  snapFrameToGrid,
} from "@/lib/canvas-layout-grid";
import {
  applyThemeChangeToCanvas,
  bindElementsToThemeTokens,
} from "@/lib/canvas-theme-style";
import type { OrganizationPublic } from "@/lib/organization";
import {
  copyDesktopToMobile,
  createLibraryElement,
  elementsForArtboard,
  getCanvasTemplate,
  parseSiteCanvasConfig,
  type CanvasArtboardId,
  type CanvasElement,
  type CanvasTemplateId,
  type SiteCanvasConfig,
} from "@/lib/site-canvas";
import type { PublicBarber, ServiceSummary } from "@/lib/types";
import { useCanvasHistory } from "@/lib/use-canvas-history";
import { cn } from "@/lib/utils";

type UnitInfo = {
  id: string;
  name: string;
  addressLine: string | null;
  city: string | null;
  isDefault: boolean;
};

type Props = {
  initialOrg: OrganizationPublic;
  services: ServiceSummary[];
  barbers: PublicBarber[];
  units: UnitInfo[];
  slogans: { primary: string; secondary: string };
  initialCanvasStudioSeen?: boolean;
};

type MobileSheet =
  | "library"
  | "inspector"
  | "tools"
  | "options"
  | "layers"
  | null;

type ConfirmState =
  | { type: "template"; id: CanvasTemplateId }
  | { type: "generate-mobile" }
  | null;

/** Nunca mostra erro técnico (ex.: mensagem de validação do Zod) para o dono da barbearia. */
function friendlyError(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : "";
  if (!msg || /expected|invalid|zod|must be|required/i.test(msg)) {
    return fallback;
  }
  return msg;
}

export function SiteCanvasEditor({
  initialOrg,
  services,
  barbers,
  units,
  slogans,
  initialCanvasStudioSeen,
}: Props) {
  const [org, setOrg] = useState(initialOrg);
  const {
    canvas,
    setCanvas,
    commitCanvas,
    replaceCanvas,
    beginInteraction,
    endInteraction,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCanvasHistory(
    parseSiteCanvasConfig(initialOrg.siteJson, initialOrg.name),
  );
  const [lastSavedCanvas, setLastSavedCanvas] = useState<SiteCanvasConfig>(
    () => parseSiteCanvasConfig(initialOrg.siteJson, initialOrg.name),
  );
  const [artboard, setArtboard] = useState<CanvasArtboardId>("desktop");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => !initialCanvasStudioSeen,
  );
  const [phonePreviewOpen, setPhonePreviewOpen] = useState(false);
  const [leftPanel, setLeftPanel] = useState<"library" | "layers">("library");

  const dirty = JSON.stringify(canvas) !== JSON.stringify(lastSavedCanvas);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const parsed = parseSiteCanvasConfig(initialOrg.siteJson, initialOrg.name);
    replaceCanvas(parsed);
    setLastSavedCanvas(parsed);
    setOrg(initialOrg);
  }, [initialOrg, replaceCanvas]);

  useEffect(() => {
    if (!mobileSheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileSheet]);

  const selected = useMemo(
    () => canvas.elements.find((e) => e.id === selectedId) ?? null,
    [canvas.elements, selectedId],
  );

  const layerElements = useMemo(
    () => canvas.elements.filter((e) => e.artboard === artboard),
    [canvas.elements, artboard],
  );

  const stageEmpty = useMemo(
    () => elementsForArtboard(canvas, artboard).length === 0,
    [canvas, artboard],
  );

  const boardW = canvas.artboards[artboard].width;
  const boardH = canvas.artboards[artboard].height;

  function snapAllOnArtboard() {
    commitCanvas((c) => ({
      ...c,
      elements: c.elements.map((e) =>
        e.artboard === artboard
          ? { ...e, frame: snapFrameToGrid(e.frame) }
          : e,
      ),
    }));
    setToast(
      `Tela ${artboard === "desktop" ? "Desktop" : "Celular"}: elementos alinhados à grade.`,
    );
    setMobileSheet(null);
  }

  const patchElement = useCallback(
    (next: CanvasElement) => {
      setCanvas((c) => ({
        ...c,
        elements: c.elements.map((e) => (e.id === next.id ? next : e)),
      }));
    },
    [setCanvas],
  );

  const selectElement = useCallback((id: string | null) => {
    setSelectedId(id);
    // Canva-lite: ao clicar, mostra barra/opções — não abre o formulário inteiro.
    setMobileSheet((s) =>
      s === "inspector" || s === "options" || s === "library" ? null : s,
    );
  }, []);

  function alignSelected(
    align: Parameters<typeof alignFrameToArtboard>[2],
  ) {
    if (!selected) return;
    commitCanvas((c) => ({
      ...c,
      elements: c.elements.map((e) =>
        e.id === selected.id
          ? {
              ...e,
              frame: alignFrameToArtboard(e.frame, {
                width: boardW,
                height: boardH,
              }, align),
            }
          : e,
      ),
    }));
  }

  async function markSeen() {
    try {
      await fetch("/api/admin/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingJson: { canvasStudioSeen: true } }),
      });
    } catch {
      // melhor esforço — não bloqueia o fluxo do editor
    }
  }

  async function save() {
    setSaving(true);
    setToast("");
    setError("");
    try {
      const res = await fetch("/api/admin/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteJson: canvas,
          primaryColor: canvas.theme?.primary ?? undefined,
          onboardingJson: { branding: true, canvasStudioSeen: true },
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        organization?: OrganizationPublic;
      };
      if (!res.ok) throw new Error(data.message ?? "Falha ao salvar.");
      if (data.organization) {
        setOrg(data.organization);
        const next = parseSiteCanvasConfig(
          data.organization.siteJson,
          data.organization.name,
        );
        replaceCanvas(next);
        setLastSavedCanvas(next);
      } else {
        setLastSavedCanvas(canvas);
      }
      setToast("Alterações no ar — o site público já mostra isso.");
      setMobileSheet(null);
    } catch (e) {
      setError(friendlyError(e, "Não foi possível salvar. Tente novamente."));
    } finally {
      setSaving(false);
    }
  }

  async function doApplyTemplate(id: CanvasTemplateId) {
    setSaving(true);
    setToast("");
    setError("");
    try {
      const local = getCanvasTemplate(id, org.name);
      const res = await fetch("/api/admin/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteTemplate: id,
          siteJson: local,
          name: org.name,
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        organization?: OrganizationPublic;
      };
      if (!res.ok) throw new Error(data.message ?? "Falha no modelo.");
      const next = parseSiteCanvasConfig(
        data.organization?.siteJson ?? local,
        org.name,
      );
      commitCanvas(next);
      setLastSavedCanvas(next);
      if (data.organization) setOrg(data.organization);
      setSelectedId(null);
      setTemplatesOpen(false);
      setMobileSheet(null);
      setConfirm(null);
      setToast("Modelo aplicado.");
    } catch (e) {
      setError(
        friendlyError(e, "Não foi possível aplicar o modelo. Tente novamente."),
      );
    } finally {
      setSaving(false);
    }
  }

  function applyTemplate(id: CanvasTemplateId) {
    setConfirm({ type: "template", id });
  }

  function addElement(el: CanvasElement) {
    commitCanvas((c) => ({ ...c, elements: [...c.elements, el] }));
    setSelectedId(el.id);
    setMobileSheet("inspector");
  }

  function addElements(els: CanvasElement[]) {
    if (!els.length) return;
    commitCanvas((c) => {
      const bottom = Math.max(...els.map((e) => e.frame.y + e.frame.h), 0);
      const board = c.artboards[artboard];
      const nextH = Math.max(board.height, bottom + 80);
      return {
        ...c,
        artboards: {
          ...c.artboards,
          [artboard]: { ...board, height: nextH },
        },
        elements: [...c.elements, ...els],
      };
    });
    setSelectedId(els[els.length - 1]?.id ?? null);
    setToast(`${els.length} elementos da seção adicionados.`);
    setMobileSheet("inspector");
  }

  function deleteSelected() {
    if (!selectedId) return;
    commitCanvas((c) => ({
      ...c,
      elements: c.elements.filter((e) => e.id !== selectedId),
    }));
    setSelectedId(null);
    setMobileSheet(null);
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy: CanvasElement = {
      ...selected,
      id: `${selected.type}-${Date.now().toString(36)}`,
      frame: {
        ...selected.frame,
        x: selected.frame.x + 16,
        y: selected.frame.y + 16,
      },
      zIndex: selected.zIndex + 1,
    };
    commitCanvas((c) => ({ ...c, elements: [...c.elements, copy] }));
    setSelectedId(copy.id);
  }

  const bringFront = useCallback(
    (id?: string) => {
      const targetId = id ?? selectedId;
      if (!targetId) return;
      commitCanvas((c) => {
        const peers = c.elements.filter((e) => e.artboard === artboard);
        const maxZ = peers.reduce((m, e) => Math.max(m, e.zIndex), 0);
        return {
          ...c,
          elements: c.elements.map((e) =>
            e.id === targetId ? { ...e, zIndex: maxZ + 1 } : e,
          ),
        };
      });
    },
    [artboard, commitCanvas, selectedId],
  );

  const sendBack = useCallback(
    (id?: string) => {
      const targetId = id ?? selectedId;
      if (!targetId) return;
      commitCanvas((c) => {
        const peers = c.elements.filter((e) => e.artboard === artboard);
        const minZ = peers.reduce((m, e) => Math.min(m, e.zIndex), 999);
        const nextZ = Math.max(0, minZ - 1);
        return {
          ...c,
          elements: c.elements.map((e) =>
            e.id === targetId ? { ...e, zIndex: nextZ } : e,
          ),
        };
      });
    },
    [artboard, commitCanvas, selectedId],
  );

  const toggleLock = useCallback(
    (id?: string) => {
      const targetId = id ?? selectedId;
      if (!targetId) return;
      commitCanvas((c) => ({
        ...c,
        elements: c.elements.map((e) =>
          e.id === targetId ? { ...e, locked: !e.locked } : e,
        ),
      }));
    },
    [commitCanvas, selectedId],
  );

  const toggleHidden = useCallback(
    (id?: string) => {
      const targetId = id ?? selectedId;
      if (!targetId) return;
      commitCanvas((c) => ({
        ...c,
        elements: c.elements.map((e) =>
          e.id === targetId ? { ...e, hidden: !e.hidden } : e,
        ),
      }));
    },
    [commitCanvas, selectedId],
  );

  function applyGenerateMobile() {
    commitCanvas((c) => copyDesktopToMobile(c));
    setArtboard("mobile");
    setSelectedId(null);
    setToast("Versão celular gerada a partir do desktop.");
    setMobileSheet(null);
    setConfirm(null);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && key === "s") {
        e.preventDefault();
        void save();
        return;
      }
      if (!mod && (e.key === "Delete" || e.key === "Backspace")) {
        if (selected && !selected.locked) {
          e.preventDefault();
          deleteSelected();
        }
        return;
      }
      if (!mod && e.key === "Escape") {
        setSelectedId(null);
        setMobileSheet(null);
        return;
      }
      if (
        !mod &&
        (e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight")
      ) {
        if (!selected || selected.locked) return;
        e.preventDefault();
        const step = e.shiftKey ? CANVAS_SNAP_GRID : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const targetId = selected.id;
        commitCanvas((c) => ({
          ...c,
          elements: c.elements.map((el) =>
            el.id === targetId
              ? { ...el, frame: { ...el.frame, x: el.frame.x + dx, y: el.frame.y + dy } }
              : el,
          ),
        }));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    artboard,
    commitCanvas,
    deleteSelected,
    duplicateSelected,
    redo,
    save,
    selected,
    selectedId,
    undo,
  ]);

  const historyBtn =
    "inline-flex size-8 items-center justify-center rounded-lg border border-[var(--bn-border)] text-[var(--bn-on-variant)] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35";

  const secondaryBtn =
    "rounded-lg border border-[var(--bn-border)] px-3 py-1.5 text-xs font-medium text-[var(--bn-on-variant)] transition hover:bg-white/5 disabled:opacity-50";

  const primaryBtn =
    "rounded-lg bg-[var(--bn-primary-container)] px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50";

  const dockBtn =
    "flex min-w-[4.25rem] flex-1 flex-col items-center gap-0.5 rounded-xl px-1.5 py-1.5 text-[10px] font-semibold transition";
  const dockBtnActive = "bg-[var(--bn-primary-container)]/20 text-[var(--bn-primary)]";
  const dockBtnIdle =
    "text-[var(--bn-muted)] hover:bg-white/5 hover:text-[var(--bn-on)]";

  const sheetListBtn =
    "w-full rounded-xl px-4 py-3 text-left text-sm text-[var(--bn-on)] hover:bg-white/5";

  const libraryBlock = (
    <>
      <ThemePanel
        theme={canvas.theme}
        onChange={(theme) =>
          setCanvas((c) => applyThemeChangeToCanvas(c, theme))
        }
        onBindElements={() => {
          commitCanvas((c) => ({
            ...c,
            elements: bindElementsToThemeTokens(c.elements),
          }));
          setToast(
            "Cores do tema aplicadas aos elementos (texto, botões, painéis…).",
          );
        }}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        <ElementLibrary
          artboard={artboard}
          boardW={boardW}
          atY={nextArtboardY(canvas, artboard)}
          onAdd={addElement}
          onAddMany={addElements}
        />
      </div>
    </>
  );

  const inspectorProps = {
    element: selected,
    artboardSize: { width: boardW, height: boardH },
    onChange: patchElement,
    onDelete: deleteSelected,
    onDuplicate: duplicateSelected,
    onBringFront: bringFront,
    onSendBack: sendBack,
  };

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]",
        "h-[calc(100svh-5.5rem)] min-h-[520px] rounded-2xl",
        "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-14 max-lg:z-20 max-lg:h-auto max-lg:min-h-0 max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0",
      )}
    >
      <PageTemplatePicker
        open={templatesOpen}
        busy={saving}
        onClose={() => setTemplatesOpen(false)}
        onPick={(id) => applyTemplate(id)}
      />

      <CanvasConfirmModal
        open={confirm !== null}
        title={
          confirm?.type === "template"
            ? "Aplicar este modelo?"
            : "Gerar versão celular?"
        }
        description={
          confirm?.type === "template"
            ? "Isso substitui o layout atual (desktop e celular) por este modelo. Você pode desfazer com Ctrl+Z."
            : "Substitui a tela Celular com uma versão escalada do Desktop. Você pode desfazer (Ctrl+Z)."
        }
        confirmLabel={confirm?.type === "template" ? "Aplicar modelo" : "Gerar celular"}
        busy={confirm?.type === "template" ? saving : false}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === "template") {
            void doApplyTemplate(confirm.id);
          } else {
            applyGenerateMobile();
          }
        }}
        onCancel={() => setConfirm(null)}
      />

      <CanvasOnboarding
        open={onboardingOpen}
        busy={saving}
        orgSlug={org.slug}
        onPickTemplate={(id) => void doApplyTemplate(id)}
        onOpenTheme={() => {
          setLeftPanel("library");
          setMobileSheet("library");
          setOnboardingOpen(false);
          void markSeen();
        }}
        onPublish={() => {
          void (async () => {
            await save();
            void markSeen();
            window.open(`/${org.slug}`, "_blank");
            setOnboardingOpen(false);
          })();
        }}
        onSkip={() => {
          void markSeen();
          setOnboardingOpen(false);
        }}
      />

      <CanvasPhonePreview
        open={phonePreviewOpen}
        canvas={canvas}
        org={org}
        services={services}
        barbers={barbers}
        units={units}
        slogans={slogans}
        onClose={() => setPhonePreviewOpen(false)}
      />

      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--bn-border)] px-2 py-2 sm:px-3">
        <div className="flex rounded-lg border border-[var(--bn-border)] p-0.5">
          {(["desktop", "mobile"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setArtboard(id);
                setSelectedId(null);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition sm:px-3",
                artboard === id
                  ? "bg-[var(--bn-primary-container)] text-white"
                  : "text-[var(--bn-muted)] hover:bg-white/5 hover:text-[var(--bn-on)]",
              )}
            >
              {id === "desktop" ? "Desktop" : "Celular"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className={historyBtn}
            disabled={!canUndo}
            title="Voltar (Ctrl+Z)"
            aria-label="Voltar"
            onClick={undo}
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            className={historyBtn}
            disabled={!canRedo}
            title="Avançar (Ctrl+Y)"
            aria-label="Avançar"
            onClick={redo}
          >
            <RedoIcon />
          </button>
        </div>

        <div className="hidden flex-wrap gap-1.5 lg:flex">
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => setConfirm({ type: "generate-mobile" })}
          >
            Gerar versão celular
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={snapAllOnArtboard}
            className={secondaryBtn}
            title="Ajusta X/Y/L/A de todos os elementos da tela atual para múltiplos de 8px"
          >
            Alinhar tudo à grade
          </button>
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => setPhonePreviewOpen(true)}
          >
            Preview celular
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => setTemplatesOpen(true)}
            className={primaryBtn}
          >
            Modelos de página
          </button>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {toast ? (
            <span className="hidden max-w-[16rem] truncate rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 sm:inline">
              {toast}
            </span>
          ) : null}
          {error ? (
            <span className="max-w-[10rem] truncate text-xs text-rose-300 sm:max-w-none">
              {error}
            </span>
          ) : null}
          <span
            className={cn(
              "hidden items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex",
              dirty
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
            )}
          >
            {dirty ? "Não salvo" : "No ar"}
          </span>
          <Link
            href={`/${org.slug}`}
            target="_blank"
            className={cn(secondaryBtn, "hidden lg:inline-flex")}
          >
            Ver site
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            title="Salva e atualiza o site"
            className={cn(primaryBtn, "px-3 py-1.5 sm:px-4")}
          >
            {saving ? "…" : "Publicar"}
          </button>
        </div>
      </header>

      {/* Barra Canva-lite no topo (mobile) */}
      <nav
        className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/95 px-1 py-1.5 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Ferramentas do canvas"
      >
        {selected ? (
          <>
            <button
              type="button"
              className={cn(
                dockBtn,
                mobileSheet === "library" ? dockBtnActive : dockBtnIdle,
              )}
              onClick={() =>
                setMobileSheet((s) => (s === "library" ? null : "library"))
              }
            >
              <LibraryIcon />
              Elementos
            </button>
            <button
              type="button"
              className={cn(
                dockBtn,
                mobileSheet === "layers" ? dockBtnActive : dockBtnIdle,
              )}
              onClick={() =>
                setMobileSheet((s) => (s === "layers" ? null : "layers"))
              }
            >
              <LibraryIcon />
              Camadas
            </button>
            <button
              type="button"
              className={cn(dockBtn, dockBtnIdle)}
              onClick={duplicateSelected}
            >
              <DupIcon />
              Duplicar
            </button>
            <button
              type="button"
              className={cn(
                dockBtn,
                mobileSheet === "inspector" ? dockBtnActive : dockBtnIdle,
              )}
              onClick={() =>
                setMobileSheet((s) =>
                  s === "inspector" ? null : "inspector",
                )
              }
            >
              <InspectIcon />
              Editar
            </button>
            <button
              type="button"
              className={cn(
                dockBtn,
                mobileSheet === "options" ? dockBtnActive : dockBtnIdle,
              )}
              onClick={() =>
                setMobileSheet((s) => (s === "options" ? null : "options"))
              }
            >
              <MoreIcon />
              Opções
            </button>
            <button
              type="button"
              className={cn(dockBtn, "text-rose-300 hover:bg-rose-500/15")}
              onClick={deleteSelected}
            >
              <TrashIcon />
              Excluir
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={cn(dockBtn, dockBtnIdle)}
              onClick={() => setTemplatesOpen(true)}
            >
              <TemplatesIcon />
              Modelos
            </button>
            <button
              type="button"
              className={cn(
                dockBtn,
                mobileSheet === "library" ? dockBtnActive : dockBtnIdle,
              )}
              onClick={() =>
                setMobileSheet((s) => (s === "library" ? null : "library"))
              }
            >
              <LibraryIcon />
              Elementos
            </button>
            <button
              type="button"
              className={cn(
                dockBtn,
                mobileSheet === "layers" ? dockBtnActive : dockBtnIdle,
              )}
              onClick={() =>
                setMobileSheet((s) => (s === "layers" ? null : "layers"))
              }
            >
              <InspectIcon />
              Camadas
            </button>
            <button
              type="button"
              className={cn(dockBtn, dockBtnIdle)}
              onClick={() =>
                addElement(
                  createLibraryElement(
                    "text",
                    artboard,
                    boardW,
                    nextArtboardY(canvas, artboard),
                  ),
                )
              }
            >
              <TextToolIcon />
              Texto
            </button>
            <button
              type="button"
              className={cn(dockBtn, dockBtnIdle)}
              onClick={() =>
                addElement(
                  createLibraryElement(
                    "image",
                    artboard,
                    boardW,
                    nextArtboardY(canvas, artboard),
                  ),
                )
              }
            >
              <GalleryIcon />
              Galeria
            </button>
            <button
              type="button"
              className={cn(
                dockBtn,
                mobileSheet === "library" ? dockBtnActive : dockBtnIdle,
              )}
              onClick={() =>
                setMobileSheet((s) => (s === "library" ? null : "library"))
              }
              title="Cores e tema da marca"
            >
              <BrandIcon />
              Marca
            </button>
            <button
              type="button"
              className={cn(
                dockBtn,
                mobileSheet === "tools" ? dockBtnActive : dockBtnIdle,
              )}
              onClick={() =>
                setMobileSheet((s) => (s === "tools" ? null : "tools"))
              }
            >
              <MoreIcon />
              Mais
            </button>
          </>
        )}
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="hidden w-56 shrink-0 flex-col border-r border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] lg:flex">
          <div className="flex shrink-0 border-b border-[var(--bn-border)]">
            <button
              type="button"
              onClick={() => setLeftPanel("library")}
              className={cn(
                "flex-1 px-3 py-2 text-xs font-semibold transition",
                leftPanel === "library"
                  ? "border-b-2 border-[var(--bn-primary)] text-[var(--bn-on)]"
                  : "text-[var(--bn-muted)] hover:text-[var(--bn-on)]",
              )}
            >
              Biblioteca
            </button>
            <button
              type="button"
              onClick={() => setLeftPanel("layers")}
              className={cn(
                "flex-1 px-3 py-2 text-xs font-semibold transition",
                leftPanel === "layers"
                  ? "border-b-2 border-[var(--bn-primary)] text-[var(--bn-on)]"
                  : "text-[var(--bn-muted)] hover:text-[var(--bn-on)]",
              )}
            >
              Camadas
            </button>
          </div>
          {leftPanel === "library" ? (
            libraryBlock
          ) : (
            <CanvasLayersPanel
              elements={layerElements}
              selectedId={selectedId}
              onSelect={selectElement}
              onToggleHidden={toggleHidden}
              onToggleLock={toggleLock}
              onBringFront={bringFront}
              onSendBack={sendBack}
              className="min-h-0 flex-1"
            />
          )}
        </div>

        {/*
          min-w-0 + overflow-hidden: igual à main, onde o CanvasStage era
          filho direto do flex. Sem isso o zoom estoura a coluna e o pai
          corta a arte (sem barra de rolagem horizontal).
        */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CanvasStage
            canvas={canvas}
            onChange={(next: SiteCanvasConfig) => setCanvas(next)}
            onInteractionStart={beginInteraction}
            onInteractionEnd={endInteraction}
            artboard={artboard}
            selectedId={selectedId}
            onSelect={selectElement}
            org={org}
            services={services}
            barbers={barbers}
            units={units}
            slogans={slogans}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
            onBringFront={bringFront}
            onSendBack={sendBack}
            onToggleLock={toggleLock}
            onOpenInspector={() => setMobileSheet("inspector")}
            onOpenOptions={() => setMobileSheet("options")}
          />
          {stageEmpty ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div
                className="pointer-events-auto flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-[#2F3336] px-6 py-8 text-center shadow-2xl"
                style={{ backgroundColor: "#25282B" }}
              >
                <p className="text-sm text-[var(--bn-on-variant)]">
                  Esta tela ainda não tem elementos.
                </p>
                <button
                  type="button"
                  onClick={() => setTemplatesOpen(true)}
                  className="rounded-lg bg-[var(--bn-primary-container)] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Começar com um modelo
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="hidden lg:contents">
          <ElementInspector {...inspectorProps} />
        </div>
      </div>

      {mobileSheet ? (
        <div className="absolute inset-0 z-30 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/80"
            aria-label="Fechar painel"
            onClick={() => setMobileSheet(null)}
          />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 flex max-h-[min(78svh,640px)] flex-col overflow-hidden rounded-t-2xl border border-[#2F3336] shadow-2xl",
              "pb-[max(0.25rem,env(safe-area-inset-bottom))]",
            )}
            style={{ backgroundColor: "#25282B" }}
            role="dialog"
            aria-modal="true"
            aria-label={
              mobileSheet === "library"
                ? "Biblioteca"
                : mobileSheet === "layers"
                  ? "Camadas"
                  : mobileSheet === "inspector"
                    ? "Propriedades"
                    : mobileSheet === "options"
                      ? "Opções do elemento"
                      : "Mais opções"
            }
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--bn-border)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--bn-on)]">
                {mobileSheet === "library"
                  ? "Biblioteca e tema"
                  : mobileSheet === "layers"
                    ? "Camadas"
                    : mobileSheet === "inspector"
                      ? selected
                        ? `Editar · ${ELEMENT_TYPE_LABEL[selected.type] ?? selected.type}`
                        : "Propriedades"
                      : mobileSheet === "options"
                        ? selected
                          ? `Opções · ${ELEMENT_TYPE_LABEL[selected.type] ?? selected.type}`
                          : "Opções"
                        : "Ferramentas"}
              </p>
              <button
                type="button"
                onClick={() => setMobileSheet(null)}
                className="rounded-full border border-[var(--bn-border)] px-3 py-1 text-xs text-[var(--bn-muted)] hover:bg-white/5"
              >
                Fechar
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {mobileSheet === "library" ? (
                <div className="flex h-full min-h-[50svh] flex-col">
                  <ThemePanel
                    theme={canvas.theme}
                    className="max-h-[28svh] shrink-0"
                    onChange={(theme) =>
                      setCanvas((c) => applyThemeChangeToCanvas(c, theme))
                    }
                    onBindElements={() => {
                      commitCanvas((c) => ({
                        ...c,
                        elements: bindElementsToThemeTokens(c.elements),
                      }));
                      setToast(
                        "Cores do tema aplicadas aos elementos (texto, botões, painéis…).",
                      );
                    }}
                  />
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <ElementLibrary
                      artboard={artboard}
                      boardW={boardW}
                      atY={nextArtboardY(canvas, artboard)}
                      onAdd={addElement}
                      onAddMany={addElements}
                    />
                  </div>
                </div>
              ) : null}
              {mobileSheet === "layers" ? (
                <CanvasLayersPanel
                  elements={layerElements}
                  selectedId={selectedId}
                  onSelect={selectElement}
                  onToggleHidden={toggleHidden}
                  onToggleLock={toggleLock}
                  onBringFront={bringFront}
                  onSendBack={sendBack}
                  className="min-h-[50svh] flex-1"
                />
              ) : null}
              {mobileSheet === "inspector" ? (
                <ElementInspector
                  {...inspectorProps}
                  className="w-full border-l-0"
                />
              ) : null}
              {mobileSheet === "options" && selected ? (
                <div className="space-y-1 p-3">
                  <button
                    type="button"
                    className={sheetListBtn}
                    onClick={() => {
                      duplicateSelected();
                      setMobileSheet(null);
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className={sheetListBtn}
                    onClick={() => {
                      toggleLock();
                      setMobileSheet(null);
                    }}
                  >
                    {selected.locked ? "Desbloquear" : "Bloquear"}
                  </button>
                  <button
                    type="button"
                    className={sheetListBtn}
                    onClick={() => {
                      toggleHidden();
                      setMobileSheet(null);
                    }}
                  >
                    {selected.hidden ? "Mostrar" : "Ocultar"}
                  </button>
                  <button
                    type="button"
                    className={sheetListBtn}
                    onClick={() => {
                      bringFront();
                      setMobileSheet(null);
                    }}
                  >
                    Trazer à frente
                  </button>
                  <button
                    type="button"
                    className={sheetListBtn}
                    onClick={() => {
                      sendBack();
                      setMobileSheet(null);
                    }}
                  >
                    Enviar para trás
                  </button>
                  <p className="px-4 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--bn-muted)]">
                    Alinhar à página
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 px-2 pb-2">
                    {(
                      [
                        ["left", "Esquerda"],
                        ["centerX", "Centro ↔"],
                        ["right", "Direita"],
                        ["top", "Topo"],
                        ["centerY", "Centro ↕"],
                        ["bottom", "Base"],
                      ] as const
                    ).map(([align, label]) => (
                      <button
                        key={align}
                        type="button"
                        className="rounded-lg border border-[var(--bn-border)] px-2 py-2.5 text-[11px] text-[var(--bn-on-variant)] hover:bg-white/5"
                        onClick={() => {
                          alignSelected(align);
                          setMobileSheet(null);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-xl px-4 py-3 text-left text-sm text-rose-300 hover:bg-rose-500/10"
                    onClick={() => {
                      deleteSelected();
                      setMobileSheet(null);
                    }}
                  >
                    Excluir
                  </button>
                </div>
              ) : null}
              {mobileSheet === "tools" ? (
                <div className="space-y-2 p-4">
                  {toast ? (
                    <p className="text-xs text-emerald-300">{toast}</p>
                  ) : null}
                  <button
                    type="button"
                    className="w-full rounded-xl border border-[var(--bn-border)] px-4 py-3 text-left text-sm text-[var(--bn-on)] hover:bg-white/5"
                    onClick={() => {
                      setMobileSheet(null);
                      setConfirm({ type: "generate-mobile" });
                    }}
                  >
                    Gerar versão celular
                    <span className="mt-0.5 block text-[11px] text-[var(--bn-muted)]">
                      Escala o layout desktop para a tela celular
                    </span>
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-[var(--bn-border)] px-4 py-3 text-left text-sm text-[var(--bn-on)] hover:bg-white/5"
                    onClick={() => {
                      setMobileSheet(null);
                      setPhonePreviewOpen(true);
                    }}
                  >
                    Preview celular
                    <span className="mt-0.5 block text-[11px] text-[var(--bn-muted)]">
                      Veja como fica no celular sem publicar
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    className="w-full rounded-xl bg-[var(--bn-primary-container)] px-4 py-3 text-left text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
                    onClick={() => {
                      setMobileSheet(null);
                      setTemplatesOpen(true);
                    }}
                  >
                    Modelos de página
                    <span className="mt-0.5 block text-[11px] font-normal text-white/70">
                      Substitui desktop e celular
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    className="w-full rounded-xl border border-[var(--bn-border)] px-4 py-3 text-left text-sm text-[var(--bn-on)] hover:bg-white/5 disabled:opacity-50"
                    onClick={snapAllOnArtboard}
                  >
                    Alinhar tudo à grade
                  </button>
                  <Link
                    href={`/${org.slug}`}
                    target="_blank"
                    className="block w-full rounded-xl border border-[var(--bn-border)] px-4 py-3 text-left text-sm text-[var(--bn-on)] hover:bg-white/5"
                    onClick={() => setMobileSheet(null)}
                  >
                    Ver site público
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 14 4 9l5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 9h10.5a6.5 6.5 0 1 1 0 13H12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m15 14 5-5-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 9H9.5a6.5 6.5 0 1 0 0 13H12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="4"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="14"
        y="4"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="3"
        y="13"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="14"
        y="13"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function InspectIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h10M4 17h7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="17" cy="16" r="3.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}

function DupIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="8"
        y="8"
        width="10"
        height="12"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M6 16V6a1.5 1.5 0 0 1 1.5-1.5H14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 8h12M10 8V6h4v2M9 8v10h6V8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TemplatesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="4"
        width="8"
        height="16"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="13"
        y="4"
        width="8"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="13"
        y="13"
        width="8"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function TextToolIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 19h4M8 19V6h3l5 13h3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 12h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h3l1.5-2h7L17 7h3v12H4V7z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function BrandIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="6"
        width="16"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8 12h8M10 9v6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CanvasStage,
  ELEMENT_TYPE_LABEL,
  ElementInspector,
  ElementLibrary,
  PageTemplatePicker,
  ThemePanel,
} from "@/components/site-canvas/canvas-studio-parts";
import { nextArtboardY } from "@/lib/canvas-presets";
import { alignFrameToArtboard, snapFrameToGrid } from "@/lib/canvas-layout-grid";
import {
  applyThemeChangeToCanvas,
  bindElementsToThemeTokens,
} from "@/lib/canvas-theme-style";
import type { OrganizationPublic } from "@/lib/organization";
import {
  copyDesktopToMobile,
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
};

type MobileSheet = "library" | "inspector" | "tools" | "options" | null;

export function SiteCanvasEditor({
  initialOrg,
  services,
  barbers,
  units,
  slogans,
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
  const [artboard, setArtboard] = useState<CanvasArtboardId>("desktop");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);

  useEffect(() => {
    replaceCanvas(parseSiteCanvasConfig(initialOrg.siteJson, initialOrg.name));
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
    setMessage(`Arteboard ${artboard}: elementos alinhados à grade.`);
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
      if (!mod) return;

      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteJson: canvas,
          primaryColor: canvas.theme?.primary ?? undefined,
          onboardingJson: { branding: true },
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        organization?: OrganizationPublic;
      };
      if (!res.ok) throw new Error(data.message ?? "Falha ao salvar.");
      if (data.organization) {
        setOrg(data.organization);
        replaceCanvas(
          parseSiteCanvasConfig(
            data.organization.siteJson,
            data.organization.name,
          ),
        );
      }
      setMessage("Canvas salvo.");
      setMobileSheet(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  async function applyTemplate(id: CanvasTemplateId) {
    if (
      !window.confirm(
        "Aplicar este modelo substitui o layout atual (desktop e mobile). Continuar?",
      )
    ) {
      return;
    }
    setSaving(true);
    setMessage("");
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
      if (!res.ok) throw new Error(data.message ?? "Falha no template.");
      const next = parseSiteCanvasConfig(
        data.organization?.siteJson ?? local,
        org.name,
      );
      commitCanvas(next);
      if (data.organization) setOrg(data.organization);
      setSelectedId(null);
      setTemplatesOpen(false);
      setMobileSheet(null);
      setMessage(`Modelo “${id}” aplicado.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setSaving(false);
    }
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
    setMessage(`${els.length} elementos da seção adicionados.`);
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

  function bringFront() {
    if (!selectedId) return;
    commitCanvas((c) => {
      const peers = c.elements.filter((e) => e.artboard === artboard);
      const maxZ = peers.reduce((m, e) => Math.max(m, e.zIndex), 0);
      return {
        ...c,
        elements: c.elements.map((e) =>
          e.id === selectedId ? { ...e, zIndex: maxZ + 1 } : e,
        ),
      };
    });
  }

  function sendBack() {
    if (!selectedId) return;
    commitCanvas((c) => {
      const peers = c.elements.filter((e) => e.artboard === artboard);
      const minZ = peers.reduce((m, e) => Math.min(m, e.zIndex), 999);
      const nextZ = Math.max(0, minZ - 1);
      return {
        ...c,
        elements: c.elements.map((e) =>
          e.id === selectedId ? { ...e, zIndex: nextZ } : e,
        ),
      };
    });
  }

  function toggleLockSelected() {
    if (!selected) return;
    commitCanvas((c) => ({
      ...c,
      elements: c.elements.map((e) =>
        e.id === selected.id ? { ...e, locked: !e.locked } : e,
      ),
    }));
  }

  function copyDeskToMobile() {
    commitCanvas((c) => copyDesktopToMobile(c));
    setArtboard("mobile");
    setSelectedId(null);
    setMessage("Layout desktop copiado para mobile (escalado).");
    setMobileSheet(null);
  }

  const historyBtn =
    "inline-flex size-8 items-center justify-center rounded-lg border border-white/15 text-zinc-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35";

  const dockBtn =
    "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-semibold transition";

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
          setMessage(
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
        "relative flex flex-col overflow-hidden border border-white/10 bg-zinc-950",
        "h-[calc(100svh-5.5rem)] min-h-[520px] rounded-2xl",
        "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-14 max-lg:z-20 max-lg:h-auto max-lg:min-h-0 max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0",
      )}
    >
      <PageTemplatePicker
        open={templatesOpen}
        busy={saving}
        onClose={() => setTemplatesOpen(false)}
        onPick={(id) => void applyTemplate(id)}
      />
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-2 py-2 sm:px-3">
        <div className="flex rounded-full border border-white/10 p-0.5">
          {(["desktop", "mobile"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setArtboard(id);
                setSelectedId(null);
              }}
              className={
                artboard === id
                  ? "rounded-full bg-brand-500 px-2.5 py-1 text-xs font-bold text-zinc-950 sm:px-3"
                  : "rounded-full px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5 sm:px-3"
              }
            >
              {id === "desktop" ? "Desk" : "Mob"}
              <span className="hidden sm:inline">
                {id === "desktop" ? "top" : "ile"}
              </span>
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

        <div className="hidden flex-wrap gap-1 lg:flex">
          <button
            type="button"
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
            onClick={copyDeskToMobile}
          >
            Copiar desk → mobile
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => setTemplatesOpen(true)}
            className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-200 hover:bg-brand-500/20 disabled:opacity-50"
          >
            Modelos de página
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={snapAllOnArtboard}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50"
            title="Ajusta X/Y/L/A de todos os elementos do arteboard atual para múltiplos de 8px"
          >
            Alinhar tudo à grade
          </button>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {message ? (
            <span className="hidden max-w-[12rem] truncate text-xs text-emerald-300 sm:inline">
              {message}
            </span>
          ) : null}
          {error ? (
            <span className="max-w-[10rem] truncate text-xs text-rose-300 sm:max-w-none">
              {error}
            </span>
          ) : null}
          <Link
            href={`/${org.slug}`}
            target="_blank"
            className="hidden rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5 lg:inline-flex"
          >
            Ver site
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-full bg-brand-400 px-3 py-1.5 text-xs font-bold text-zinc-950 disabled:opacity-60 sm:px-4"
          >
            {saving ? "…" : "Salvar"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-zinc-950 lg:flex">
          {libraryBlock}
        </div>
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
          onToggleLock={toggleLockSelected}
          onOpenInspector={() => setMobileSheet("inspector")}
          onOpenOptions={() => setMobileSheet("options")}
        />
        <div className="hidden lg:contents">
          <ElementInspector {...inspectorProps} />
        </div>
      </div>

      <nav
        className="flex shrink-0 gap-1 border-t border-white/10 bg-zinc-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden"
        aria-label="Ferramentas do canvas"
      >
        {selected ? (
          <>
            <button
              type="button"
              className={cn(
                dockBtn,
                mobileSheet === "library"
                  ? "bg-brand-500/20 text-brand-200"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
              )}
              onClick={() =>
                setMobileSheet((s) => (s === "library" ? null : "library"))
              }
            >
              <LibraryIcon />
              Biblioteca
            </button>
            <button
              type="button"
              className={cn(dockBtn, "text-zinc-300 hover:bg-white/5")}
              onClick={duplicateSelected}
            >
              <DupIcon />
              Duplicar
            </button>
            <button
              type="button"
              className={cn(
                dockBtn,
                mobileSheet === "inspector"
                  ? "bg-brand-500/20 text-brand-200"
                  : "text-zinc-300 hover:bg-white/5",
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
                mobileSheet === "options"
                  ? "bg-brand-500/20 text-brand-200"
                  : "text-zinc-300 hover:bg-white/5",
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
              className={cn(
                dockBtn,
                "text-rose-300 hover:bg-rose-500/15",
              )}
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
              className={cn(
                dockBtn,
                mobileSheet === "library"
                  ? "bg-brand-500/20 text-brand-200"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
              )}
              onClick={() =>
                setMobileSheet((s) => (s === "library" ? null : "library"))
              }
            >
              <LibraryIcon />
              Biblioteca
            </button>
            <button
              type="button"
              className={cn(
                dockBtn,
                "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
              )}
              onClick={() => setMobileSheet("inspector")}
            >
              <InspectIcon />
              Propriedades
            </button>
            <button
              type="button"
              className={cn(
                dockBtn,
                mobileSheet === "tools"
                  ? "bg-brand-500/20 text-brand-200"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
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

      {mobileSheet ? (
        <div className="absolute inset-0 z-30 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Fechar painel"
            onClick={() => setMobileSheet(null)}
          />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 flex max-h-[min(78svh,640px)] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-zinc-950 shadow-2xl",
              "pb-[max(0.25rem,env(safe-area-inset-bottom))]",
            )}
            role="dialog"
            aria-modal="true"
            aria-label={
              mobileSheet === "library"
                ? "Biblioteca"
                : mobileSheet === "inspector"
                  ? "Propriedades"
                  : mobileSheet === "options"
                    ? "Opções do elemento"
                    : "Mais opções"
            }
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-100">
                {mobileSheet === "library"
                  ? "Biblioteca e tema"
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
                className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300 hover:bg-white/5"
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
                      setMessage(
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
                    className="w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-100 hover:bg-white/5"
                    onClick={() => {
                      duplicateSelected();
                      setMobileSheet(null);
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-100 hover:bg-white/5"
                    onClick={() => {
                      toggleLockSelected();
                      setMobileSheet(null);
                    }}
                  >
                    {selected.locked ? "Desbloquear" : "Bloquear"}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-100 hover:bg-white/5"
                    onClick={() => {
                      bringFront();
                      setMobileSheet(null);
                    }}
                  >
                    Trazer à frente
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-100 hover:bg-white/5"
                    onClick={() => {
                      sendBack();
                      setMobileSheet(null);
                    }}
                  >
                    Enviar para trás
                  </button>
                  <p className="px-4 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
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
                        className="rounded-lg border border-white/15 px-2 py-2.5 text-[11px] text-zinc-200 hover:bg-white/5"
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
                  {message ? (
                    <p className="text-xs text-emerald-300">{message}</p>
                  ) : null}
                  <button
                    type="button"
                    className="w-full rounded-xl border border-white/15 px-4 py-3 text-left text-sm text-zinc-100 hover:bg-white/5"
                    onClick={copyDeskToMobile}
                  >
                    Copiar desk → mobile
                    <span className="mt-0.5 block text-[11px] text-zinc-500">
                      Escala o layout desktop para o arteboard mobile
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    className="w-full rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-left text-sm font-semibold text-brand-200 hover:bg-brand-500/20 disabled:opacity-50"
                    onClick={() => {
                      setMobileSheet(null);
                      setTemplatesOpen(true);
                    }}
                  >
                    Modelos de página
                    <span className="mt-0.5 block text-[11px] font-normal text-brand-200/70">
                      Substitui desktop e mobile
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    className="w-full rounded-xl border border-white/15 px-4 py-3 text-left text-sm text-zinc-100 hover:bg-white/5 disabled:opacity-50"
                    onClick={snapAllOnArtboard}
                  >
                    Alinhar tudo à grade
                  </button>
                  <Link
                    href={`/${org.slug}`}
                    target="_blank"
                    className="block w-full rounded-xl border border-white/15 px-4 py-3 text-left text-sm text-zinc-100 hover:bg-white/5"
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

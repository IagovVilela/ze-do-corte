"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CanvasStage,
  ElementInspector,
  ElementLibrary,
  PageTemplatePicker,
  ThemePanel,
} from "@/components/site-canvas/canvas-studio-parts";
import { nextArtboardY } from "@/lib/canvas-presets";
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

export function SiteCanvasEditor({
  initialOrg,
  services,
  barbers,
  units,
  slogans,
}: Props) {
  const [org, setOrg] = useState(initialOrg);
  const [canvas, setCanvas] = useState<SiteCanvasConfig>(() =>
    parseSiteCanvasConfig(initialOrg.siteJson, initialOrg.name),
  );
  const [artboard, setArtboard] = useState<CanvasArtboardId>("desktop");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setCanvas(parseSiteCanvasConfig(initialOrg.siteJson, initialOrg.name));
    setOrg(initialOrg);
  }, [initialOrg]);

  const selected = useMemo(
    () => canvas.elements.find((e) => e.id === selectedId) ?? null,
    [canvas.elements, selectedId],
  );

  const boardW = canvas.artboards[artboard].width;

  const patchElement = useCallback((next: CanvasElement) => {
    setCanvas((c) => ({
      ...c,
      elements: c.elements.map((e) => (e.id === next.id ? next : e)),
    }));
  }, []);

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
        setCanvas(
          parseSiteCanvasConfig(
            data.organization.siteJson,
            data.organization.name,
          ),
        );
      }
      setMessage("Canvas salvo.");
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
      // Aplica no cliente primeiro (fonte confiável) e grava o siteJson validado.
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
      setCanvas(next);
      if (data.organization) setOrg(data.organization);
      setSelectedId(null);
      setTemplatesOpen(false);
      setMessage(`Modelo “${id}” aplicado.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  function addElement(el: CanvasElement) {
    setCanvas((c) => ({ ...c, elements: [...c.elements, el] }));
    setSelectedId(el.id);
  }

  function addElements(els: CanvasElement[]) {
    if (!els.length) return;
    setCanvas((c) => {
      const bottom = Math.max(
        ...els.map((e) => e.frame.y + e.frame.h),
        0,
      );
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
  }

  function deleteSelected() {
    if (!selectedId) return;
    setCanvas((c) => ({
      ...c,
      elements: c.elements.filter((e) => e.id !== selectedId),
    }));
    setSelectedId(null);
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
    setCanvas((c) => ({ ...c, elements: [...c.elements, copy] }));
    setSelectedId(copy.id);
  }

  function bringFront() {
    if (!selectedId) return;
    setCanvas((c) => {
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
    setCanvas((c) => {
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

  return (
    <div className="flex h-[calc(100svh-5.5rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
      <PageTemplatePicker
        open={templatesOpen}
        busy={saving}
        onClose={() => setTemplatesOpen(false)}
        onPick={(id) => void applyTemplate(id)}
      />
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
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
                  ? "rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-zinc-950"
                  : "rounded-full px-3 py-1 text-xs text-zinc-300 hover:bg-white/5"
              }
            >
              {id === "desktop" ? "Desktop" : "Mobile"}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
          onClick={() => {
            setCanvas((c) => copyDesktopToMobile(c));
            setArtboard("mobile");
            setSelectedId(null);
            setMessage("Layout desktop copiado para mobile (escalado).");
          }}
        >
          Copiar desk → mobile
        </button>

        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={saving}
            onClick={() => setTemplatesOpen(true)}
            className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-200 hover:bg-brand-500/20 disabled:opacity-50"
          >
            Modelos de página
          </button>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {message ? (
            <span className="text-xs text-emerald-300">{message}</span>
          ) : null}
          {error ? <span className="text-xs text-rose-300">{error}</span> : null}
          <Link
            href={`/${org.slug}`}
            target="_blank"
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
          >
            Ver site
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-full bg-brand-400 px-4 py-1.5 text-xs font-bold text-zinc-950 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar canvas"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-zinc-950">
          <ThemePanel
            theme={canvas.theme}
            onChange={(theme) =>
              setCanvas((c) => applyThemeChangeToCanvas(c, theme))
            }
            onBindElements={() => {
              setCanvas((c) => ({
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
        <CanvasStage
          canvas={canvas}
          onChange={setCanvas}
          artboard={artboard}
          selectedId={selectedId}
          onSelect={setSelectedId}
          org={org}
          services={services}
          barbers={barbers}
          units={units}
          slogans={slogans}
        />
        <ElementInspector
          element={selected}
          onChange={patchElement}
          onDelete={deleteSelected}
          onDuplicate={duplicateSelected}
          onBringFront={bringFront}
          onSendBack={sendBack}
        />
      </div>
    </div>
  );
}

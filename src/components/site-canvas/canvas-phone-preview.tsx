"use client";

import Link from "next/link";

import { CanvasElementView } from "@/components/tenant-canvas-renderer";
import { canvasThemeStyle } from "@/lib/canvas-theme-style";
import type { OrganizationPublic } from "@/lib/organization";
import {
  elementsForArtboard,
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
  open: boolean;
  canvas: SiteCanvasConfig;
  org: OrganizationPublic;
  services: ServiceSummary[];
  barbers: PublicBarber[];
  units: UnitInfo[];
  slogans: { primary: string; secondary: string };
  onClose: () => void;
};

const PHONE_W = 390;

export function CanvasPhonePreview({
  open,
  canvas,
  org,
  services,
  barbers,
  units,
  slogans,
  onClose,
}: Props) {
  if (!open) return null;

  const board = canvas.artboards.mobile;
  const elements = elementsForArtboard(canvas, "mobile");
  const scale = PHONE_W / board.width;
  const phoneH = Math.min(720, board.height * scale);

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

  return (
    <div className="fixed inset-0 z-[88] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/85"
        aria-label="Fechar preview"
        onClick={onClose}
      />
      <div
        className="relative z-[1] flex max-h-[min(94svh,860px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#2F3336] shadow-2xl max-sm:rounded-b-none"
        style={{ backgroundColor: "#25282B" }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--bn-border)] px-4 py-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.1em] text-[var(--bn-primary)] uppercase">
              Preview celular
            </p>
            <h2 className="font-brand-headline mt-1 text-lg font-bold text-[var(--bn-on)]">
              Como fica no celular
            </h2>
            <p className="mt-1 text-xs text-[var(--bn-muted)]">
              Mostra a tela Celular do canvas (mesmo rascunho, sem precisar publicar).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--bn-border)] px-3 py-1.5 text-xs text-[var(--bn-muted)] hover:bg-white/5"
          >
            Fechar
          </button>
        </div>

        <div
          className="flex min-h-0 flex-1 justify-center overflow-y-auto px-4 py-6"
          style={{ backgroundColor: "#0b0e15" }}
        >
          <div
            className="relative overflow-hidden rounded-[1.75rem] border-[6px] border-[#1a1d24] bg-black shadow-xl"
            style={{ width: PHONE_W + 12, height: phoneH + 12 }}
          >
            <div
              className="origin-top-left overflow-hidden"
              style={{
                width: board.width,
                height: board.height,
                transform: `scale(${scale})`,
                ...canvasThemeStyle(canvas.theme, org.primaryColor),
              }}
            >
              <div
                className="relative"
                style={{ width: board.width, height: board.height }}
              >
                {elements.map((el) => (
                  <CanvasElementView
                    key={el.id}
                    element={el}
                    board={board}
                    ctx={ctx}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--bn-border)] px-4 py-3">
          <Link
            href={`/${org.slug}`}
            target="_blank"
            className="rounded-lg border border-[var(--bn-border)] px-3 py-2 text-xs font-medium text-[var(--bn-on-variant)] hover:bg-white/5"
          >
            Ver site publicado
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--bn-primary-container)] px-3 py-2 text-xs font-bold text-white"
          >
            Voltar ao editor
          </button>
        </div>
      </div>
    </div>
  );
}

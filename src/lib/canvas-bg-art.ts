import type { CSSProperties } from "react";

/** Arte decorativa do fundo do site (tema do canvas). */
export const CANVAS_BG_ART_IDS = [
  "none",
  "grid",
  "dots",
  "diagonal",
  "horizon",
  "glow",
  "noise",
  "checker",
] as const;

export type CanvasBgArtId = (typeof CANVAS_BG_ART_IDS)[number];

export const CANVAS_BG_ART_OPTIONS: {
  id: CanvasBgArtId;
  label: string;
  hint: string;
}[] = [
  { id: "none", label: "Só cor", hint: "Fundo liso" },
  { id: "grid", label: "Quadriculado", hint: "Linhas em grade" },
  { id: "dots", label: "Pontos", hint: "Pontilhado suave" },
  { id: "diagonal", label: "Diagonais", hint: "Faixas inclinadas" },
  { id: "horizon", label: "Linhas", hint: "Faixas horizontais" },
  { id: "glow", label: "Brilho", hint: "Manchas de luz" },
  { id: "noise", label: "Grão", hint: "Textura leve" },
  { id: "checker", label: "Xadrez", hint: "Blocos sutis" },
];

export function isCanvasBgArtId(v: string | undefined | null): v is CanvasBgArtId {
  return Boolean(v && (CANVAS_BG_ART_IDS as readonly string[]).includes(v));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

/** Hex + opacidade 0–1 → rgba. */
export function inkRgba(hex: string | undefined | null, alpha: number): string {
  const rgb = hexToRgb(hex?.trim() || "#a1a1aa");
  const a = Math.min(1, Math.max(0, alpha));
  if (!rgb) return `rgba(161,161,170,${a})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

export type CanvasBgArtOpts = {
  /** Cor das linhas / tinta do padrão (hex). */
  color?: string | null;
  /** Intensidade 0–100 (default 35). */
  strength?: number | null;
  /** Cor principal do tema (fallback do brilho). */
  primary?: string | null;
};

/**
 * Camadas CSS da arte de fundo (sobre a cor sólida do tema).
 */
export function canvasBgArtStyle(
  art: string | undefined | null,
  opts: CanvasBgArtOpts | string = {},
): Pick<
  CSSProperties,
  "backgroundImage" | "backgroundSize" | "backgroundPosition" | "backgroundRepeat"
> {
  // Compat: chamada antiga `canvasBgArtStyle(art, primary)`
  const o: CanvasBgArtOpts =
    typeof opts === "string" ? { primary: opts } : (opts ?? {});

  const id: CanvasBgArtId = isCanvasBgArtId(art) ? art : "none";
  const color = o.color?.trim().startsWith("#")
    ? o.color.trim()
    : o.primary?.trim().startsWith("#")
      ? o.primary.trim()
      : "#a1a1aa";
  const strength = Math.min(
    100,
    Math.max(5, Number.isFinite(Number(o.strength)) ? Number(o.strength) : 35),
  );
  const base = strength / 100;
  const ink = inkRgba(color, Math.min(0.95, base * 0.55));
  const inkSoft = inkRgba(color, Math.min(0.9, base * 0.35));
  const brandSoft = inkRgba(color, Math.min(0.95, base * 0.7));
  const brandFaint = inkRgba(color, Math.min(0.9, base * 0.4));

  switch (id) {
    case "none":
      return {};
    case "grid":
      return {
        backgroundImage: `linear-gradient(to right, ${ink} 1px, transparent 1px), linear-gradient(to bottom, ${ink} 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      };
    case "dots":
      return {
        backgroundImage: `radial-gradient(circle, ${ink} 1.25px, transparent 1.25px)`,
        backgroundSize: "18px 18px",
      };
    case "diagonal":
      return {
        backgroundImage: `repeating-linear-gradient(-45deg, ${inkSoft} 0 1px, transparent 1px 14px)`,
      };
    case "horizon":
      return {
        backgroundImage: `repeating-linear-gradient(0deg, ${inkSoft} 0 1px, transparent 1px 28px)`,
      };
    case "glow":
      return {
        backgroundImage: `radial-gradient(900px 480px at 12% -10%, ${brandSoft}, transparent 60%), radial-gradient(700px 420px at 88% 8%, ${brandFaint}, transparent 55%), radial-gradient(600px 500px at 50% 110%, ${brandFaint}, transparent 50%)`,
        backgroundRepeat: "no-repeat",
      };
    case "noise": {
      const rgb = hexToRgb(color) ?? { r: 161, g: 161, b: 170 };
      const op = Math.min(0.7, base * 0.55).toFixed(2);
      const svg = encodeURIComponent(
        `<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${rgb.r / 255} 0 0 0 0 ${rgb.g / 255} 0 0 0 0 ${rgb.b / 255} 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='${op}'/></svg>`,
      );
      return {
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: "180px 180px",
      };
    }
    case "checker":
      return {
        backgroundImage: `linear-gradient(45deg, ${inkSoft} 25%, transparent 25%), linear-gradient(-45deg, ${inkSoft} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${inkSoft} 75%), linear-gradient(-45deg, transparent 75%, ${inkSoft} 75%)`,
        backgroundSize: "28px 28px",
        backgroundPosition: "0 0, 0 14px, 14px -14px, -14px 0",
      };
    default: {
      const _exhaustive: never = id;
      void _exhaustive;
      return {};
    }
  }
}

/** Prévia miniatura para o seletor (editor). */
export function canvasBgArtPreviewStyle(
  id: CanvasBgArtId,
  background: string,
  opts: CanvasBgArtOpts = {},
): CSSProperties {
  return {
    backgroundColor: background,
    ...canvasBgArtStyle(id, opts),
  };
}

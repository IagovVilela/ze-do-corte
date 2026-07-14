import type { CSSProperties } from "react";

/** Arte decorativa do fundo do site (tema do canvas). */
export const CANVAS_BG_ART_IDS = [
  "none",
  "grid",
  "dots",
  "diagonal",
  "horizon",
  "vertical",
  "glow",
  "noise",
  "checker",
  "blueprint",
  "cross",
  "rings",
  "waves",
  "spark",
  "mesh",
] as const;

export type CanvasBgArtId = (typeof CANVAS_BG_ART_IDS)[number];

export const CANVAS_BG_ART_OPTIONS: {
  id: CanvasBgArtId;
  label: string;
  hint: string;
}[] = [
  { id: "none", label: "Só cor", hint: "Fundo liso" },
  { id: "grid", label: "Quadriculado", hint: "Grade fina" },
  { id: "blueprint", label: "Planta", hint: "Grade tipo engenharia" },
  { id: "dots", label: "Pontos", hint: "Pontilhado" },
  { id: "cross", label: "Cruzes", hint: "Marcas +" },
  { id: "diagonal", label: "Diagonais", hint: "Listras /" },
  { id: "mesh", label: "Malha", hint: "X entrecruzado" },
  { id: "horizon", label: "Horizontais", hint: "Linhas →" },
  { id: "vertical", label: "Verticais", hint: "Linhas ↑" },
  { id: "rings", label: "Anéis", hint: "Círculos" },
  { id: "waves", label: "Ondas", hint: "Curvas" },
  { id: "spark", label: "Faíscas", hint: "Pontos brilhantes" },
  { id: "glow", label: "Brilho", hint: "Manchas de luz" },
  { id: "noise", label: "Grão", hint: "Textura áspera" },
  { id: "checker", label: "Xadrez", hint: "Blocos" },
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
  color?: string | null;
  strength?: number | null;
  primary?: string | null;
  /** Força contraste maior (miniaturas do seletor). */
  preview?: boolean;
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
  const o: CanvasBgArtOpts =
    typeof opts === "string" ? { primary: opts } : (opts ?? {});

  const id: CanvasBgArtId = isCanvasBgArtId(art) ? art : "none";
  const color = o.color?.trim().startsWith("#")
    ? o.color.trim()
    : o.primary?.trim().startsWith("#")
      ? o.primary.trim()
      : "#94a3b8";
  const strength = Math.min(
    100,
    Math.max(5, Number.isFinite(Number(o.strength)) ? Number(o.strength) : 45),
  );
  // Preview: empurra a intensidade para a arte aparecer na miniatura.
  const base = o.preview ? Math.max(0.72, strength / 100) : strength / 100;
  const ink = inkRgba(color, Math.min(0.98, 0.18 + base * 0.65));
  const inkMid = inkRgba(color, Math.min(0.95, 0.12 + base * 0.5));
  const inkSoft = inkRgba(color, Math.min(0.9, 0.08 + base * 0.38));
  const glowA = inkRgba(color, Math.min(0.95, 0.25 + base * 0.55));
  const glowB = inkRgba(color, Math.min(0.9, 0.15 + base * 0.35));

  switch (id) {
    case "none":
      return {};
    case "grid":
      return {
        backgroundImage: `linear-gradient(to right, ${ink} 1px, transparent 1px), linear-gradient(to bottom, ${ink} 1px, transparent 1px)`,
        backgroundSize: o.preview ? "12px 12px" : "28px 28px",
      };
    case "blueprint":
      return {
        backgroundImage: [
          `linear-gradient(to right, ${ink} 1px, transparent 1px)`,
          `linear-gradient(to bottom, ${ink} 1px, transparent 1px)`,
          `linear-gradient(to right, ${inkMid} 2px, transparent 2px)`,
          `linear-gradient(to bottom, ${inkMid} 2px, transparent 2px)`,
        ].join(", "),
        backgroundSize: o.preview
          ? "10px 10px, 10px 10px, 40px 40px, 40px 40px"
          : "16px 16px, 16px 16px, 64px 64px, 64px 64px",
      };
    case "dots":
      return {
        backgroundImage: `radial-gradient(circle, ${ink} 1.6px, transparent 1.7px)`,
        backgroundSize: o.preview ? "10px 10px" : "16px 16px",
      };
    case "cross":
      return {
        backgroundImage: `linear-gradient(${ink} 2px, transparent 2px), linear-gradient(90deg, ${ink} 2px, transparent 2px)`,
        backgroundSize: o.preview ? "14px 14px" : "22px 22px",
        backgroundPosition: "center",
      };
    case "diagonal":
      return {
        backgroundImage: `repeating-linear-gradient(-45deg, ${ink} 0 2px, transparent 2px 12px)`,
      };
    case "mesh":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${inkSoft} 0 1.5px, transparent 1.5px 16px), repeating-linear-gradient(-45deg, ${ink} 0 1.5px, transparent 1.5px 16px)`,
      };
    case "horizon":
      return {
        backgroundImage: `repeating-linear-gradient(0deg, ${ink} 0 2px, transparent 2px 18px)`,
      };
    case "vertical":
      return {
        backgroundImage: `repeating-linear-gradient(90deg, ${ink} 0 2px, transparent 2px 18px)`,
      };
    case "rings":
      return {
        backgroundImage: `repeating-radial-gradient(circle at 30% 25%, transparent 0 14px, ${ink} 14px 15.5px), repeating-radial-gradient(circle at 75% 70%, transparent 0 18px, ${inkSoft} 18px 19.5px)`,
        backgroundSize: o.preview ? "70px 70px, 90px 90px" : "180px 180px, 240px 240px",
      };
    case "waves": {
      const rgb = hexToRgb(color) ?? { r: 148, g: 163, b: 184 };
      const op = Math.min(0.95, 0.25 + base * 0.6).toFixed(2);
      const svg = encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40' viewBox='0 0 120 40'><path d='M0 20 Q 30 0 60 20 T 120 20' fill='none' stroke='rgb(${rgb.r},${rgb.g},${rgb.b})' stroke-width='2' opacity='${op}'/><path d='M0 28 Q 30 8 60 28 T 120 28' fill='none' stroke='rgb(${rgb.r},${rgb.g},${rgb.b})' stroke-width='1.2' opacity='${Number(op) * 0.65}'/></svg>`,
      );
      return {
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: o.preview ? "60px 20px" : "140px 48px",
      };
    }
    case "spark":
      return {
        backgroundImage: [
          `radial-gradient(circle, ${ink} 1.4px, transparent 1.5px)`,
          `radial-gradient(circle, ${glowA} 1px, transparent 1.2px)`,
          `radial-gradient(circle at 70% 40%, ${inkMid} 1.2px, transparent 1.3px)`,
        ].join(", "),
        backgroundSize: o.preview
          ? "12px 12px, 18px 18px, 14px 20px"
          : "28px 28px, 44px 44px, 36px 52px",
        backgroundPosition: "0 0, 10px 14px, 18px 6px",
      };
    case "glow":
      return {
        backgroundImage: [
          `radial-gradient(ellipse 80% 55% at 15% 10%, ${glowA}, transparent 62%)`,
          `radial-gradient(ellipse 70% 50% at 88% 20%, ${glowB}, transparent 58%)`,
          `radial-gradient(ellipse 90% 60% at 50% 100%, ${glowB}, transparent 55%)`,
          `linear-gradient(135deg, ${inkSoft} 0%, transparent 40%, ${inkSoft} 100%)`,
        ].join(", "),
        backgroundRepeat: "no-repeat",
      };
    case "noise": {
      const rgb = hexToRgb(color) ?? { r: 148, g: 163, b: 184 };
      const op = Math.min(0.85, 0.3 + base * 0.55).toFixed(2);
      const svg = encodeURIComponent(
        `<svg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${rgb.r / 255} 0 0 0 0 ${rgb.g / 255} 0 0 0 0 ${rgb.b / 255} 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='${op}'/></svg>`,
      );
      return {
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: o.preview ? "80px 80px" : "160px 160px",
      };
    }
    case "checker":
      return {
        backgroundImage: `linear-gradient(45deg, ${inkMid} 25%, transparent 25%), linear-gradient(-45deg, ${inkMid} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${inkMid} 75%), linear-gradient(-45deg, transparent 75%, ${inkMid} 75%)`,
        backgroundSize: o.preview ? "14px 14px" : "24px 24px",
        backgroundPosition: o.preview
          ? "0 0, 0 7px, 7px -7px, -7px 0"
          : "0 0, 0 12px, 12px -12px, -12px 0",
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
    ...canvasBgArtStyle(id, { ...opts, preview: true, strength: opts.strength ?? 70 }),
  };
}

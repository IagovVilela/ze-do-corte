import type { CSSProperties } from "react";

import type { CanvasElement, CanvasTheme, SiteCanvasConfig } from "@/lib/site-canvas";

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

function mix(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function shade(hex: string, towardWhite: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const t = Math.min(1, Math.max(0, towardWhite));
  const r = mix(rgb.r, 255, t);
  const g = mix(rgb.g, 255, t);
  const b = mix(rgb.b, 255, t);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function darken(hex: string, towardBlack: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const t = Math.min(1, Math.max(0, towardBlack));
  const r = mix(rgb.r, 0, t);
  const g = mix(rgb.g, 0, t);
  const b = mix(rgb.b, 0, t);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** Mistura duas cores hex (amount = peso da primeira). */
function mixHex(a: string, b: string, amount: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  if (!A || !B) return a;
  const t = Math.min(1, Math.max(0, amount));
  const r = mix(B.r, A.r, t);
  const g = mix(B.g, A.g, t);
  const bl = mix(B.b, A.b, t);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function normalizeHex(value: string | undefined | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (v.startsWith("var(") || v.startsWith("theme.")) return null;
  const rgb = hexToRgb(v);
  if (!rgb) return null;
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

/** Contraste simples para texto sobre a cor principal. */
export function contrastOn(hex: string): string {
  return luminance(hex) > 0.55 ? "#09090b" : "#fafafa";
}

/**
 * Resolve cor de prop do canvas:
 * - `theme.primary` / `theme.text` / … → CSS vars
 * - hex / `var(...)` → como está
 */
export function resolveCanvasColor(
  value: string | undefined,
  fallback: string,
): string {
  const v = value?.trim();
  if (!v) return fallback;
  switch (v) {
    case "theme.primary":
    case "primary":
      return "var(--color-brand-500)";
    case "theme.secondary":
    case "secondary":
      return "var(--site-secondary)";
    case "theme.background":
    case "background":
      return "var(--site-bg)";
    case "theme.surface":
    case "surface":
      return "var(--site-surface)";
    case "theme.text":
    case "text":
      return "var(--site-text)";
    case "theme.onPrimary":
    case "onPrimary":
      return "var(--site-on-primary)";
    default:
      return v;
  }
}

/** Tokens CSS do tema do canvas (cliente e servidor). */
export function canvasThemeStyle(
  theme: CanvasTheme | undefined | null,
  fallbackPrimary?: string | null,
): CSSProperties {
  const t = theme ?? {};
  const primary = t.primary?.trim() || fallbackPrimary?.trim() || "#3b82f6";
  const secondary = t.secondary?.trim() || darken(primary, 0.25);
  const background = t.background?.trim() || "#0f1419";
  const surface = t.surface?.trim() || "#18181b";
  const text = t.text?.trim() || "#fafafa";
  const radius =
    t.radius === "sm" ? "0.5rem" : t.radius === "lg" ? "1.25rem" : "0.75rem";

  const fontDisplayRaw = t.fontDisplay?.trim();
  const fontBody =
    t.fontBody?.trim() || "var(--font-geist-sans), system-ui, sans-serif";
  const overrideDisplay =
    fontDisplayRaw && fontDisplayRaw !== "inherit" ? fontDisplayRaw : null;

  return {
    ["--brand" as string]: primary,
    // Aliases usados por `@theme` em globals.css → utilitários `brand-*` do Tailwind
    ["--brand-50" as string]: shade(primary, 0.85),
    ["--brand-100" as string]: shade(primary, 0.7),
    ["--brand-200" as string]: shade(primary, 0.5),
    ["--brand-300" as string]: shade(primary, 0.35),
    ["--brand-400" as string]: shade(primary, 0.18),
    ["--brand-500" as string]: primary,
    ["--brand-600" as string]: darken(primary, 0.15),
    ["--brand-700" as string]: darken(primary, 0.28),
    ["--brand-900" as string]: darken(primary, 0.5),
    ["--brand-950" as string]: darken(primary, 0.72),
    ["--brand-surface-5" as string]: mixHex(primary, background, 0.08),
    ["--brand-surface-10" as string]: mixHex(primary, background, 0.14),
    ["--brand-surface-15" as string]: mixHex(primary, background, 0.2),
    ["--brand-surface-20" as string]: mixHex(primary, background, 0.28),
    ["--brand-surface-25" as string]: mixHex(primary, background, 0.36),
    // Também direto em --color-brand-* (inline styles / resolveCanvasColor)
    ["--color-brand-50" as string]: shade(primary, 0.85),
    ["--color-brand-100" as string]: shade(primary, 0.7),
    ["--color-brand-200" as string]: shade(primary, 0.5),
    ["--color-brand-300" as string]: shade(primary, 0.35),
    ["--color-brand-400" as string]: shade(primary, 0.18),
    ["--color-brand-500" as string]: primary,
    ["--color-brand-600" as string]: darken(primary, 0.15),
    ["--color-brand-700" as string]: darken(primary, 0.28),
    ["--color-brand-900" as string]: darken(primary, 0.5),
    ["--color-brand-surface-5" as string]: mixHex(primary, background, 0.08),
    ["--color-brand-surface-10" as string]: mixHex(primary, background, 0.14),
    ["--color-brand-surface-15" as string]: mixHex(primary, background, 0.2),
    ["--color-brand-surface-20" as string]: mixHex(primary, background, 0.28),
    ["--color-brand-surface-25" as string]: mixHex(primary, background, 0.36),
    ["--site-secondary" as string]: secondary,
    ["--site-bg" as string]: background,
    ["--site-surface" as string]: surface,
    ["--site-text" as string]: text,
    ["--site-on-primary" as string]: contrastOn(primary),
    ["--site-radius" as string]: radius,
    ["--border" as string]: `color-mix(in srgb, ${text} 12%, transparent)`,
    ["--scrollbar-thumb" as string]: `color-mix(in srgb, ${primary} 40%, transparent)`,
    ["--scrollbar-thumb-hover" as string]: `color-mix(in srgb, ${primary} 60%, transparent)`,
    ...(overrideDisplay
      ? { ["--font-display" as string]: overrideDisplay }
      : {}),
    ["--font-body" as string]: fontBody,
    backgroundColor: background,
    color: text,
    fontFamily: fontBody,
  } as CSSProperties;
}

const COLOR_PROP_KEYS = [
  "color",
  "backgroundColor",
  "borderColor",
] as const;

/**
 * Se uma prop hex batia com a cor antiga do tema, troca pela nova.
 * Assim Principal/Texto/Superfície passam a afetar o que já estava “ligado” ao tema.
 */
export function remapThemeHexInElements(
  elements: CanvasElement[],
  prev: CanvasTheme | undefined | null,
  next: CanvasTheme | undefined | null,
): CanvasElement[] {
  const p = prev ?? {};
  const n = next ?? {};
  const pairs: Array<[string | undefined, string | undefined]> = [
    [p.primary, n.primary],
    [p.secondary, n.secondary],
    [p.background, n.background],
    [p.surface, n.surface],
    [p.text, n.text],
  ];
  const map = new Map<string, string>();
  for (const [from, to] of pairs) {
    const a = normalizeHex(from);
    const b = normalizeHex(to);
    if (a && b && a !== b) map.set(a.toLowerCase(), b);
  }
  if (!map.size) return elements;

  return elements.map((el) => {
    const props = { ...(el.props ?? {}) };
    let changed = false;
    for (const key of COLOR_PROP_KEYS) {
      const cur = normalizeHex(props[key] as string | undefined);
      if (!cur) continue;
      const replacement = map.get(cur.toLowerCase());
      if (replacement) {
        (props as Record<string, unknown>)[key] = replacement;
        changed = true;
      }
    }
    return changed ? { ...el, props } : el;
  });
}

/**
 * Amarra elementos aos tokens do tema (CSS vars) por tipo —
 * Principal, Superfície e Texto passam a controlar o preview de verdade.
 */
export function bindElementsToThemeTokens(
  elements: CanvasElement[],
): CanvasElement[] {
  return elements.map((el) => {
    const props = { ...(el.props ?? {}) };
    switch (el.type) {
      case "text":
        props.color = "theme.text";
        break;
      case "divider":
        props.color = "theme.secondary";
        break;
      case "button":
        if (props.variant === "outline" || props.variant === "ghost") {
          props.color = "theme.primary";
          props.borderColor = "theme.primary";
          props.backgroundColor = "transparent";
        } else {
          props.backgroundColor = "theme.primary";
          props.color = "theme.onPrimary";
        }
        break;
      case "badge":
        props.backgroundColor = "theme.primary";
        props.color = "theme.onPrimary";
        break;
      case "panel":
      case "rect":
        props.backgroundColor = "theme.surface";
        props.color = "theme.text";
        props.borderColor = "theme.secondary";
        break;
      case "hero":
        props.color = "theme.text";
        props.backgroundColor = props.backgroundColor?.startsWith("theme.")
          ? props.backgroundColor
          : "theme.surface";
        break;
      case "grid":
        props.color = "theme.text";
        break;
      case "image":
      case "media":
        props.backgroundColor = "theme.surface";
        break;
      default:
        return el;
    }
    return { ...el, props };
  });
}

export function applyThemeChangeToCanvas(
  canvas: SiteCanvasConfig,
  nextTheme: NonNullable<CanvasTheme>,
  opts?: { bindTokens?: boolean },
): SiteCanvasConfig {
  const remapped = remapThemeHexInElements(
    canvas.elements,
    canvas.theme,
    nextTheme,
  );
  const elements = opts?.bindTokens
    ? bindElementsToThemeTokens(remapped)
    : remapped;
  return { ...canvas, theme: nextTheme, elements };
}

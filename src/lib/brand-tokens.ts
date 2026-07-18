/**
 * Tokens corporativos Barbernegon (Onyx + Electric Blue).
 * Fonte de verdade para marketing, auth, planos e chrome do painel `/admin`.
 * Tenant (site público) continua com `brand-*` em globals.css.
 * Modo claro do painel: `BN_LIGHT` + `.brand-onyx[data-theme="light"]`.
 */
export const BN = {
  bg: "#10131a",
  surfaceElevated: "#25282B",
  surfaceContainer: "#1d2027",
  surfaceLowest: "#0b0e15",
  surfaceLow: "#191b23",
  on: "#e1e2ec",
  onVariant: "#c2c6d6",
  muted: "#9CA3AF",
  border: "#2F3336",
  primary: "#adc6ff",
  primaryContainer: "#3B82F6",
  outline: "#8c909f",
  accentGold: "#C5A059",
  error: "#ffb4ab",
  glow: "rgba(59, 130, 246, 0.15)",
  hover: "rgba(255, 255, 255, 0.05)",
  scrim: "rgba(0, 0, 0, 0.7)",
  chartTick: "#a1a1aa",
  chartGrid: "rgba(255, 255, 255, 0.08)",
  chartTooltipBg: "#11131a",
} as const;

/** Paleta clara do painel admin (mesmo contrato semântico que `BN`). */
export const BN_LIGHT = {
  bg: "#f4f6fa",
  surfaceElevated: "#ffffff",
  surfaceContainer: "#eef1f6",
  surfaceLowest: "#ffffff",
  surfaceLow: "#e8ecf3",
  on: "#10131a",
  onVariant: "#3f4555",
  muted: "#667085",
  border: "#d5dbe7",
  primary: "#2563eb",
  primaryContainer: "#3B82F6",
  outline: "#8c909f",
  accentGold: "#A8843E",
  error: "#b42318",
  glow: "rgba(37, 99, 235, 0.12)",
  hover: "rgba(16, 19, 26, 0.05)",
  scrim: "rgba(16, 19, 26, 0.45)",
  chartTick: "#667085",
  chartGrid: "rgba(16, 19, 26, 0.08)",
  chartTooltipBg: "#ffffff",
} as const;

/** Alias legado da landing — aponta para os mesmos valores. */
export const LN = {
  bg: BN.bg,
  surface: BN.bg,
  surfaceLow: BN.surfaceLow,
  surfaceElevated: BN.surfaceElevated,
  surfaceContainer: BN.surfaceContainer,
  surfaceLowest: BN.surfaceLowest,
  onSurface: BN.on,
  onSurfaceVariant: BN.onVariant,
  textMuted: BN.muted,
  outline: BN.outline,
  borderSubtle: BN.border,
  primary: BN.primary,
  primaryContainer: BN.primaryContainer,
  onPrimary: "#002e6a",
  accentGold: BN.accentGold,
  error: BN.error,
  glow: BN.glow,
} as const;

/** CSS custom properties para aplicar via style ou classe `.brand-onyx`. */
export const BN_CSS_VARS = {
  "--bn-bg": BN.bg,
  "--bn-surface-elevated": BN.surfaceElevated,
  "--bn-surface-container": BN.surfaceContainer,
  "--bn-surface-lowest": BN.surfaceLowest,
  "--bn-surface-low": BN.surfaceLow,
  "--bn-on": BN.on,
  "--bn-on-variant": BN.onVariant,
  "--bn-muted": BN.muted,
  "--bn-border": BN.border,
  "--bn-primary": BN.primary,
  "--bn-primary-container": BN.primaryContainer,
  "--bn-outline": BN.outline,
  "--bn-hover": BN.hover,
  "--bn-scrim": BN.scrim,
  "--bn-chart-tick": BN.chartTick,
  "--bn-chart-grid": BN.chartGrid,
  "--bn-chart-tooltip-bg": BN.chartTooltipBg,
} as const;

export const BN_LIGHT_CSS_VARS = {
  "--bn-bg": BN_LIGHT.bg,
  "--bn-surface-elevated": BN_LIGHT.surfaceElevated,
  "--bn-surface-container": BN_LIGHT.surfaceContainer,
  "--bn-surface-lowest": BN_LIGHT.surfaceLowest,
  "--bn-surface-low": BN_LIGHT.surfaceLow,
  "--bn-on": BN_LIGHT.on,
  "--bn-on-variant": BN_LIGHT.onVariant,
  "--bn-muted": BN_LIGHT.muted,
  "--bn-border": BN_LIGHT.border,
  "--bn-primary": BN_LIGHT.primary,
  "--bn-primary-container": BN_LIGHT.primaryContainer,
  "--bn-outline": BN_LIGHT.outline,
  "--bn-hover": BN_LIGHT.hover,
  "--bn-scrim": BN_LIGHT.scrim,
  "--bn-chart-tick": BN_LIGHT.chartTick,
  "--bn-chart-grid": BN_LIGHT.chartGrid,
  "--bn-chart-tooltip-bg": BN_LIGHT.chartTooltipBg,
} as const;

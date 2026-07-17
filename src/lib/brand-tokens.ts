/**
 * Tokens corporativos Barbernegon (Onyx + Electric Blue).
 * Fonte de verdade para marketing, auth, planos e chrome do painel `/admin`.
 * Tenant (site público) continua com `brand-*` em globals.css.
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
} as const;

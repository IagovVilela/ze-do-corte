/**
 * Tema claro/escuro do painel `/admin` (chrome autenticado).
 * Preferência em localStorage + cookie (anti-flash no SSR).
 */

export const ADMIN_THEME_STORAGE_KEY = "bn-admin-theme";
export const ADMIN_THEME_COOKIE = "bn-admin-theme";

export type AdminTheme = "dark" | "light";

export function parseAdminTheme(raw: string | null | undefined): AdminTheme {
  return raw === "light" ? "light" : "dark";
}

export function adminThemeCookieMaxAgeSec(): number {
  return 365 * 24 * 60 * 60;
}

/** Serializa cookie legível no servidor (path=/admin). */
export function serializeAdminThemeCookie(theme: AdminTheme): string {
  const maxAge = adminThemeCookieMaxAgeSec();
  return `${ADMIN_THEME_COOKIE}=${theme}; Path=/admin; Max-Age=${maxAge}; SameSite=Lax`;
}

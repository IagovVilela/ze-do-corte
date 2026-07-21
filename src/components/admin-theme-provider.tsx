"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ADMIN_THEME_COOKIE,
  ADMIN_THEME_STORAGE_KEY,
  parseAdminTheme,
  serializeAdminThemeCookie,
  type AdminTheme,
} from "@/lib/admin-theme";

type AdminThemeContextValue = {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

function persistTheme(theme: AdminTheme) {
  try {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
  document.cookie = serializeAdminThemeCookie(theme);
}

type Props = {
  initialTheme: AdminTheme;
  children: ReactNode;
};

/**
 * Sincroniza `data-theme` no wrapper `.brand-onyx` do painel.
 * O servidor já aplica `initialTheme` a partir do cookie (anti-flash).
 */
export function AdminThemeProvider({ initialTheme, children }: Props) {
  const [theme, setThemeState] = useState<AdminTheme>(initialTheme);

  useEffect(() => {
    try {
      const stored = parseAdminTheme(
        window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY),
      );
      if (stored !== theme) {
        setThemeState(stored);
        document.cookie = serializeAdminThemeCookie(stored);
      }
    } catch {
      /* ignore */
    }
    // Só na montagem — alinhar cookie/localStorage se divergirem
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount sync
  }, []);

  const setTheme = useCallback((next: AdminTheme) => {
    setThemeState(next);
    persistTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: AdminTheme = prev === "light" ? "dark" : "light";
      persistTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <AdminThemeContext.Provider value={value}>
      <AdminThemeDomSync theme={theme} />
      {children}
    </AdminThemeContext.Provider>
  );
}

function AdminThemeDomSync({ theme }: { theme: AdminTheme }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-admin-theme-root]");
    if (root) {
      root.dataset.theme = theme;
    }
  }, [theme]);
  return null;
}

export function useAdminTheme(): AdminThemeContextValue {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    throw new Error("useAdminTheme deve ser usado dentro de AdminThemeProvider");
  }
  return ctx;
}

export function useAdminChartColors() {
  const ctx = useAdminThemeOptional();
  const theme = ctx?.theme ?? "dark";
  const [colors, setColors] = useState({
    tick: theme === "light" ? "#667085" : "#a1a1aa",
    grid:
      theme === "light"
        ? "rgba(16, 19, 26, 0.08)"
        : "rgba(255,255,255,0.08)",
    tooltipBg: theme === "light" ? "#ffffff" : "#11131a",
    tooltipBorder:
      theme === "light"
        ? "1px solid rgba(37, 99, 235, 0.28)"
        : "1px solid rgba(59, 130, 246, 0.28)",
    tooltipColor: theme === "light" ? "#10131a" : "#e1e2ec",
  });

  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-admin-theme-root]");
    const fallbackTick = theme === "light" ? "#667085" : "#a1a1aa";
    const fallbackGrid =
      theme === "light"
        ? "rgba(16, 19, 26, 0.08)"
        : "rgba(255,255,255,0.08)";
    const fallbackTooltipBg = theme === "light" ? "#ffffff" : "#11131a";
    const fallbackOn = theme === "light" ? "#10131a" : "#e1e2ec";
    if (!root) {
      setColors({
        tick: fallbackTick,
        grid: fallbackGrid,
        tooltipBg: fallbackTooltipBg,
        tooltipBorder:
          theme === "light"
            ? "1px solid rgba(37, 99, 235, 0.28)"
            : "1px solid rgba(59, 130, 246, 0.28)",
        tooltipColor: fallbackOn,
      });
      return;
    }
    const styles = getComputedStyle(root);
    const tick = styles.getPropertyValue("--bn-chart-tick").trim();
    const grid = styles.getPropertyValue("--bn-chart-grid").trim();
    const tooltipBg = styles.getPropertyValue("--bn-chart-tooltip-bg").trim();
    const on = styles.getPropertyValue("--bn-on").trim();
    setColors({
      tick: tick || fallbackTick,
      grid: grid || fallbackGrid,
      tooltipBg: tooltipBg || fallbackTooltipBg,
      tooltipBorder:
        theme === "light"
          ? "1px solid rgba(37, 99, 235, 0.28)"
          : "1px solid rgba(59, 130, 246, 0.28)",
      tooltipColor: on || fallbackOn,
    });
  }, [theme]);

  return colors;
}

/** Leitura opcional sem throw (ex.: fora do painel). */
export function useAdminThemeOptional(): AdminThemeContextValue | null {
  return useContext(AdminThemeContext);
}

export { ADMIN_THEME_COOKIE, ADMIN_THEME_STORAGE_KEY };

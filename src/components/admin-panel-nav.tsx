"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  Menu,
  Search,
  Star,
  X,
  Clock3,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { BarbernegonMark } from "@/components/brand/barbernegon-mark";
import {
  ADMIN_NAV_FILTERS,
  buildAdminNavGroups,
  isAdminNavItemActive,
  navItemMatchesQuery,
  type AdminNavFilterId,
  type AdminNavGroup,
  type AdminNavItem,
} from "@/lib/admin-nav-config";
import type { StaffAccess } from "@/lib/staff-access";
import { cn } from "@/lib/utils";

const roleLabel: Record<StaffAccess["role"], string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  STAFF: "Funcionário",
};

const FAVORITES_KEY = "bn-admin-nav-favorites";
const RECENT_KEY = "bn-admin-nav-recent";
const OPEN_GROUPS_KEY = "bn-admin-nav-open-groups";
const FILTER_KEY = "bn-admin-nav-filter";
const NAV_SCROLL_KEY = "bn-admin-nav-scroll";
const MAX_RECENT = 6;

function sessionDisplayName(access: StaffAccess): string {
  const trimmed = access.displayName?.trim();
  if (trimmed) return trimmed;
  const email = access.email?.trim();
  if (email?.includes("@")) return email.split("@")[0] ?? email;
  if (email) return email;
  return "";
}

function readJsonArray(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function writeJsonArray(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function readOpenGroups(defaults: Record<string, boolean>): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(OPEN_GROUPS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return defaults;
    return { ...defaults, ...(parsed as Record<string, boolean>) };
  } catch {
    return defaults;
  }
}

export function AdminPanelNav({
  access,
  proUnlocked = true,
  shopName,
  shopLogoUrl = null,
}: {
  access: StaffAccess;
  proUnlocked?: boolean;
  shopName: string;
  shopLogoUrl?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const name = sessionDisplayName(access);
  const shopLabel = shopName.trim() || "Barbearia";
  const [mobileOpen, setMobileOpen] = useState(false);
  const topBarRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const navScrollRef = useRef<HTMLElement | null>(null);
  const pendingScrollRestore = useRef<number | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AdminNavFilterId>("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  const saveNavScroll = useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const top = el.scrollTop;
    // Após remount o scroll volta a 0 — não apaga a posição salva no clique.
    if (
      top === 0 &&
      pendingScrollRestore.current != null &&
      pendingScrollRestore.current > 0
    ) {
      return;
    }
    pendingScrollRestore.current = top;
    try {
      window.sessionStorage.setItem(NAV_SCROLL_KEY, String(top));
    } catch {
      /* ignore */
    }
  }, []);

  const restoreNavScroll = useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    let top = pendingScrollRestore.current;
    if (top == null) {
      try {
        const raw = window.sessionStorage.getItem(NAV_SCROLL_KEY);
        if (raw != null) top = Number(raw);
      } catch {
        top = null;
      }
    }
    if (top == null || Number.isNaN(top)) return;
    el.scrollTop = top;
    pendingScrollRestore.current = top;
  }, []);

  const allGroups = useMemo(
    () =>
      buildAdminNavGroups(access, proUnlocked)
        .map((g) => ({ ...g, items: g.items.filter((i) => i.show) }))
        .filter((g) => g.items.length > 0),
    [access, proUnlocked],
  );

  const flatItems = useMemo(
    () => allGroups.flatMap((g) => g.items),
    [allGroups],
  );

  const itemByHref = useMemo(() => {
    const map = new Map<string, AdminNavItem>();
    for (const item of flatItems) map.set(item.href, item);
    return map;
  }, [flatItems]);

  useEffect(() => {
    const defaults: Record<string, boolean> = {};
    for (const g of allGroups) {
      defaults[g.id] = g.defaultOpen ?? true;
    }
    setOpenGroups(readOpenGroups(defaults));
    setFavorites(readJsonArray(FAVORITES_KEY));
    setRecent(readJsonArray(RECENT_KEY));
    try {
      const saved = window.localStorage.getItem(FILTER_KEY);
      if (
        saved &&
        ADMIN_NAV_FILTERS.some((f) => f.id === saved)
      ) {
        setFilter(saved as AdminNavFilterId);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [allGroups]);

  useEffect(() => {
    if (!hydrated) return;
    writeJsonArray(FAVORITES_KEY, favorites);
  }, [favorites, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    writeJsonArray(RECENT_KEY, recent);
  }, [recent, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(openGroups));
    } catch {
      /* ignore */
    }
  }, [openGroups, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(FILTER_KEY, filter);
    } catch {
      /* ignore */
    }
  }, [filter, hydrated]);

  useEffect(() => {
    // No desktop mantém a busca; no mobile só fecha o drawer.
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!hydrated) return;
    const match = flatItems.find((i) => isAdminNavItemActive(pathname, i.href));
    if (!match) return;
    setRecent((prev) => {
      const next = [match.href, ...prev.filter((h) => h !== match.href)].slice(
        0,
        MAX_RECENT,
      );
      return next;
    });
    setOpenGroups((prev) => {
      const group = allGroups.find((g) =>
        g.items.some((i) => i.href === match.href),
      );
      if (!group || prev[group.id]) return prev;
      return { ...prev, [group.id]: true };
    });
  }, [pathname, hydrated, flatItems, allGroups]);

  // Restaura o scroll do menu após navegação / reordenar “Recentes”.
  useLayoutEffect(() => {
    restoreNavScroll();
    const id = window.requestAnimationFrame(() => restoreNavScroll());
    return () => window.cancelAnimationFrame(id);
  }, [pathname, recent, openGroups, restoreNavScroll]);

  useEffect(() => {
    if (!hydrated) return;
    const el = navScrollRef.current;
    if (!el) return;
    try {
      const raw = window.sessionStorage.getItem(NAV_SCROLL_KEY);
      if (raw != null) {
        const top = Number(raw);
        if (!Number.isNaN(top)) {
          el.scrollTop = top;
          pendingScrollRestore.current = top;
        }
      }
    } catch {
      /* ignore */
    }
  }, [hydrated]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.adminNavOpen = "1";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      delete document.documentElement.dataset.adminNavOpen;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement | null)?.isContentEditable) return;
      e.preventDefault();
      setMobileOpen(true);
      window.setTimeout(() => searchRef.current?.focus(), 50);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const syncTop = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty(
        "--admin-mobile-top",
        `${h}px`,
      );
    };
    syncTop();
    const ro = new ResizeObserver(syncTop);
    ro.observe(el);
    window.addEventListener("orientationchange", syncTop);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", syncTop);
      document.documentElement.style.removeProperty("--admin-mobile-top");
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const toggleFavorite = useCallback((href: string) => {
    setFavorites((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    );
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const searching = query.trim().length > 0;

  const visibleGroups = useMemo(() => {
    return allGroups
      .filter((g) => filter === "all" || g.filter === filter)
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => navItemMatchesQuery(i, query)),
      }))
      .filter((g) => g.items.length > 0);
  }, [allGroups, filter, query]);

  const favoriteItems = useMemo(
    () =>
      favorites
        .map((href) => itemByHref.get(href))
        .filter((i): i is AdminNavItem => Boolean(i))
        .filter((i) => navItemMatchesQuery(i, query)),
    [favorites, itemByHref, query],
  );

  const recentItems = useMemo(
    () =>
      recent
        .map((href) => itemByHref.get(href))
        .filter((i): i is AdminNavItem => Boolean(i))
        .filter((i) => !favorites.includes(i.href))
        .filter((i) => navItemMatchesQuery(i, query))
        .slice(0, 5),
    [recent, itemByHref, favorites, query],
  );

  const availableFilters = useMemo(() => {
    const present = new Set(allGroups.map((g) => g.filter));
    return ADMIN_NAV_FILTERS.filter(
      (f) => f.id === "all" || present.has(f.id),
    );
  }, [allGroups]);

  const shopBrand = (
    <Link
      href="/admin"
      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[var(--bn-primary)]/40"
      title={shopLabel}
    >
      <BrandLogo
        size={40}
        src={shopLogoUrl}
        alt={shopLabel}
        fallbackLabel={shopLabel}
        className="rounded-full bg-[var(--bn-surface-container)] ring-1 ring-[var(--bn-border)]"
        priority
      />
      <span className="min-w-0 flex-1">
        <span className="font-brand-headline block truncate text-sm font-bold text-[var(--bn-on)]">
          {shopLabel}
        </span>
        <span className="block truncate text-[11px] text-[var(--bn-muted)]">
          Painel · Barbernegon
        </span>
      </span>
    </Link>
  );

  function renderNavLink(item: AdminNavItem, opts?: { showStar?: boolean }) {
    const active = isAdminNavItemActive(pathname, item.href);
    const Icon = item.icon;
    const isFav = favorites.includes(item.href);
    return (
      <li key={item.href}>
        <div
          className={cn(
            "group flex items-center gap-0.5 rounded-lg transition",
            active
              ? "bg-[var(--bn-primary-container)]/15 ring-1 ring-[var(--bn-primary)]/25"
              : "hover:bg-[var(--bn-hover)]",
          )}
        >
          <Link
            href={item.href}
            scroll={false}
            onClick={saveNavScroll}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition",
              active
                ? "text-[var(--bn-primary)]"
                : "text-[var(--bn-on-variant)] group-hover:text-[var(--bn-on)]",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0",
                active ? "text-[var(--bn-primary)]" : "text-[var(--bn-muted)]",
              )}
              aria-hidden
            />
            <span className="truncate">{item.label}</span>
            {item.badge ? (
              <span className="ml-auto shrink-0 rounded-md bg-[var(--bn-primary)]/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[var(--bn-primary)] uppercase">
                {item.badge}
              </span>
            ) : null}
          </Link>
          {opts?.showStar !== false ? (
            <button
              type="button"
              title={isFav ? "Remover dos favoritos" : "Favoritar"}
              aria-label={isFav ? "Remover dos favoritos" : "Favoritar"}
              onClick={() => toggleFavorite(item.href)}
              className={cn(
                "mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md transition sm:size-8",
                isFav
                  ? "text-amber-400"
                  : "text-[var(--bn-muted)] opacity-100 hover:text-amber-400 lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100",
              )}
            >
              <Star
                className={cn("size-3.5", isFav && "fill-current")}
                aria-hidden
              />
            </button>
          ) : null}
        </div>
      </li>
    );
  }

  function Section({
    title,
    icon,
    children,
    empty,
  }: {
    title: string;
    icon?: ReactNode;
    children: ReactNode;
    empty?: boolean;
  }) {
    if (empty) return null;
    return (
      <div className="mb-4">
        <p className="mb-1.5 flex items-center gap-1.5 px-2.5 text-[11px] font-bold tracking-[0.1em] text-[var(--bn-muted)] uppercase">
          {icon}
          {title}
        </p>
        <ul className="flex flex-col gap-0.5">{children}</ul>
      </div>
    );
  }

  function CollapsibleGroup({ group }: { group: AdminNavGroup }) {
    const open = searching || openGroups[group.id] !== false;
    return (
      <div className="mb-1">
        <button
          type="button"
          onClick={() => toggleGroup(group.id)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-[var(--bn-hover)]"
          aria-expanded={open}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold tracking-[0.1em] text-[var(--bn-muted)] uppercase">
              {group.label}
            </span>
            {group.hint ? (
              <span className="block truncate text-[10px] text-[var(--bn-muted)]/80 normal-case tracking-normal font-medium">
                {group.hint}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-[var(--bn-muted)] transition",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {open ? (
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {group.items.map((item) => renderNavLink(item))}
          </ul>
        ) : null}
      </div>
    );
  }

  const sidebarBody = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--bn-border)] px-3 py-3">
        {shopBrand}
        <button
          type="button"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-[var(--bn-muted)] transition hover:bg-[var(--bn-hover)] hover:text-[var(--bn-on)] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="shrink-0 space-y-2 border-b border-[var(--bn-border)] px-3 py-3">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-[var(--bn-muted)]"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no menu…"
            className="w-full rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface)] py-2.5 pr-3 pl-10 text-base text-[var(--bn-on)] outline-none placeholder:text-[var(--bn-muted)] focus:border-[var(--bn-primary)]/50 focus:ring-2 focus:ring-[var(--bn-primary)]/20 sm:py-2 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            aria-label="Buscar no menu"
          />
        </label>
        <p className="hidden px-0.5 text-[10px] text-[var(--bn-muted)] sm:block">
          Atalho <kbd className="rounded border border-[var(--bn-border)] px-1 font-mono">/</kbd> para buscar
        </p>
        <div className="-mx-1 flex gap-1 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [scrollbar-width:none]">
          {availableFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "min-h-9 shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                filter === f.id
                  ? "bg-[var(--bn-primary)] text-white"
                  : "bg-[var(--bn-surface)] text-[var(--bn-on-variant)] hover:text-[var(--bn-on)]",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <nav
        ref={(el) => {
          navScrollRef.current = el;
        }}
        aria-label="Seções do painel"
        onScroll={saveNavScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3"
      >
        {!searching ? (
          <>
            <Section
              title="Favoritos"
              icon={<Star className="size-3 fill-amber-400 text-amber-400" />}
              empty={favoriteItems.length === 0}
            >
              {favoriteItems.map((item) => renderNavLink(item))}
            </Section>
            <Section
              title="Recentes"
              icon={<Clock3 className="size-3" />}
              empty={recentItems.length === 0}
            >
              {recentItems.map((item) => renderNavLink(item))}
            </Section>
          </>
        ) : null}

        {visibleGroups.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-[var(--bn-muted)]">
            Nenhum item para “{query.trim() || filter}”.
          </p>
        ) : (
          <div className="flex flex-col gap-2 pb-2">
            {visibleGroups.map((group) => (
              <CollapsibleGroup key={group.id} group={group} />
            ))}
          </div>
        )}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] p-3">
        <BarbernegonMark
          href="/admin"
          size={28}
          withWordmark
          className="w-full px-1 text-[var(--bn-on)] [&_span]:text-sm [&_span]:sm:text-sm [&_span]:md:text-sm"
        />
        <Link
          href="/admin/perfil"
          className="flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-[var(--bn-hover)]"
          title="Meu perfil"
        >
          <span className="relative block size-9 shrink-0 overflow-hidden rounded-full bg-[var(--bn-surface-container)] ring-1 ring-[var(--bn-border)]">
            {access.profileImageUrl ? (
              <Image
                src={access.profileImageUrl}
                alt=""
                width={36}
                height={36}
                className="size-9 object-cover"
              />
            ) : (
              <span className="flex size-9 items-center justify-center text-xs font-semibold text-[var(--bn-on-variant)]">
                {(access.displayName || access.email || "?")
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-[var(--bn-on)]">
              {name || "Perfil"}
            </span>
            <span className="block truncate text-xs text-[var(--bn-muted)]">
              {roleLabel[access.role]}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full rounded-lg border border-[var(--bn-border)] px-3 py-2.5 text-xs font-medium text-[var(--bn-on-variant)] transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-[var(--bn-status-danger)]"
        >
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={topBarRef}
        className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--bn-border)] bg-[var(--bn-bg)] px-4 py-3 lg:hidden"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
        }}
      >
        <button
          type="button"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-[var(--bn-border)] text-[var(--bn-on)] transition hover:bg-[var(--bn-hover)]"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <Link
          href="/admin"
          className="flex min-w-0 flex-1 items-center gap-2.5"
          title={shopLabel}
        >
          <BrandLogo
            size={32}
            src={shopLogoUrl}
            alt={shopLabel}
            fallbackLabel={shopLabel}
            className="rounded-full bg-[var(--bn-surface-container)] ring-1 ring-[var(--bn-border)]"
          />
          <span className="font-brand-headline truncate text-sm font-bold text-[var(--bn-on)]">
            {shopLabel}
          </span>
        </Link>
        <button
          type="button"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-[var(--bn-border)] text-[var(--bn-on)] transition hover:bg-[var(--bn-hover)]"
          onClick={() => {
            setMobileOpen(true);
            window.setTimeout(() => searchRef.current?.focus(), 80);
          }}
          aria-label="Buscar no menu"
        >
          <Search className="size-5" />
        </button>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[90] bg-[var(--bn-scrim)] lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[100] flex h-dvh max-h-dvh w-[min(20rem,calc(100vw-2.5rem))] flex-col overflow-hidden border-r border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] transition-transform duration-200 lg:w-[17.5rem] lg:translate-x-0",
          "pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarBody}
      </aside>
    </>
  );
}

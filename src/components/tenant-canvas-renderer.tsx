"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { HomeBarbersGrid } from "@/components/home-barbers-grid";
import { HomeContactGrid } from "@/components/home-contact-grid";
import { HomeServicesGrid } from "@/components/home-services-grid";
import { SiteFooter } from "@/components/site-footer";
import { isCanvasVideoUrl } from "@/lib/canvas-media";
import type { OrganizationPublic } from "@/lib/organization";
import {
  elementsForArtboard,
  type CanvasArtboardId,
  type CanvasElement,
  type SiteCanvasConfig,
} from "@/lib/site-canvas";
import { canvasThemeStyle, resolveCanvasColor } from "@/lib/canvas-theme-style";
import type { PublicBarber, ServiceSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

function CanvasMediaFill({
  url,
  className,
  absolute,
}: {
  url: string;
  className?: string;
  absolute?: boolean;
}) {
  const cls = cn(
    absolute ? "absolute inset-0 h-full w-full object-cover" : "h-full w-full object-cover",
    className,
  );
  if (isCanvasVideoUrl(url)) {
    return (
      <video
        src={url}
        className={cls}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={cls} />;
}

type UnitInfo = {
  id: string;
  name: string;
  addressLine: string | null;
  city: string | null;
  isDefault: boolean;
};

type Ctx = {
  org: OrganizationPublic;
  services: ServiceSummary[];
  barbers: PublicBarber[];
  units: UnitInfo[];
  homeHref: string;
  bookHref: string;
  slogans: { primary: string; secondary: string };
  interactive?: boolean;
};

function resolveHref(href: string | undefined, bookHref: string, homeHref: string) {
  const h = href?.trim();
  if (!h || h === "book") return bookHref;
  if (h === "home") return homeHref;
  return h;
}

function frameStyle(
  el: CanvasElement,
  board: { width: number; height: number },
): React.CSSProperties {
  return {
    position: "absolute",
    left: `${(el.frame.x / board.width) * 100}%`,
    top: `${(el.frame.y / board.height) * 100}%`,
    width: `${(el.frame.w / board.width) * 100}%`,
    height: `${(el.frame.h / board.height) * 100}%`,
    zIndex: el.zIndex,
    opacity: el.props?.opacity ?? 1,
  };
}

export function CanvasElementView({
  element,
  board,
  ctx,
  className,
  layout = "absolute",
}: {
  element: CanvasElement;
  board: { width: number; height: number };
  ctx: Ctx;
  className?: string;
  layout?: "absolute" | "fill";
}) {
  const p = element.props ?? {};
  const { org, services, barbers, units, homeHref, bookHref, slogans } = ctx;
  const style: React.CSSProperties =
    layout === "fill"
      ? {
          position: "relative",
          width: "100%",
          height: "100%",
          opacity: p.opacity ?? 1,
        }
      : frameStyle(element, board);

  switch (element.type) {
    case "text":
      return (
        <div
          className={cn(
            "overflow-hidden whitespace-pre-wrap",
            (p.variant === "display" ||
              p.variant === "title" ||
              p.variant === "eyebrow") &&
              "font-display",
            className,
          )}
          style={{
            ...style,
            color: resolveCanvasColor(p.color, "var(--site-text)"),
            fontSize: p.fontSize ? `${p.fontSize}px` : undefined,
            fontWeight: p.fontWeight,
            textAlign: p.align || "left",
            lineHeight: 1.25,
            letterSpacing: p.variant === "eyebrow" ? "0.18em" : undefined,
            textTransform: p.variant === "eyebrow" ? "uppercase" : undefined,
          }}
        >
          {p.text || ""}
        </div>
      );
    case "button": {
      const href = resolveHref(p.href, bookHref, homeHref);
      const borderW = p.borderWidth ?? 0;
      return (
        <div className={cn(className)} style={style}>
          <Link
            href={href}
            className="flex h-full w-full items-center justify-center px-4 text-center font-semibold transition hover:brightness-110"
            style={{
              backgroundColor: resolveCanvasColor(
                p.backgroundColor,
                "var(--color-brand-500)",
              ),
              color: resolveCanvasColor(p.color, "var(--site-on-primary)"),
              borderRadius: p.borderRadius ?? 999,
              fontSize: p.fontSize ?? 16,
              fontWeight: p.fontWeight ?? 700,
              borderWidth: borderW,
              borderStyle: borderW > 0 ? "solid" : undefined,
              borderColor:
                borderW > 0
                  ? resolveCanvasColor(p.borderColor, "var(--color-brand-500)")
                  : undefined,
              boxSizing: "border-box",
            }}
          >
            {p.text || "Botão"}
          </Link>
        </div>
      );
    }
    case "rect":
      return (
        <div
          className={cn(className)}
          style={{
            ...style,
            backgroundColor: resolveCanvasColor(
              p.backgroundColor,
              "var(--site-surface)",
            ),
            border: p.borderColor
              ? `1px solid ${resolveCanvasColor(p.borderColor, "var(--site-secondary)")}`
              : undefined,
            borderRadius: p.borderRadius ?? 12,
          }}
        />
      );
    case "image":
    case "media":
      return (
        <div
          className={cn("overflow-hidden", className)}
          style={{
            ...style,
            backgroundColor: resolveCanvasColor(
              p.backgroundColor,
              "var(--site-surface)",
            ),
            borderRadius: p.borderRadius ?? 12,
          }}
        >
          {p.mediaUrl ? (
            <CanvasMediaFill url={p.mediaUrl} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs opacity-50">
              Imagem / vídeo
            </div>
          )}
        </div>
      );
    case "navbar":
      return (
        <div
          className={cn(
            "flex items-center justify-between gap-3 border-b border-white/10 px-4 backdrop-blur-md",
            className,
          )}
          style={{
            ...style,
            backgroundColor: "color-mix(in srgb, var(--site-bg) 70%, transparent)",
            color: "var(--site-text)",
          }}
        >
          <Link
            href={homeHref}
            className="flex min-w-0 items-center gap-2 font-semibold"
            style={{ color: "var(--site-text)" }}
          >
            <BrandLogo
              size={32}
              src={org.logoUrl}
              fallbackLabel={org.name}
              alt={org.name}
            />
            <span className="truncate text-sm">{org.name}</span>
          </Link>
          <Link
            href={bookHref}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold"
            style={{
              backgroundColor: "var(--color-brand-500)",
              color: "var(--site-on-primary)",
            }}
          >
            Agendar
          </Link>
        </div>
      );
    case "services":
      return (
        <div
          className={cn("overflow-auto rounded-xl p-3", className)}
          style={{
            ...style,
            backgroundColor: "color-mix(in srgb, var(--site-surface) 80%, transparent)",
            color: "var(--site-text)",
          }}
        >
          {p.title ? (
            <h2
              className="mb-3 font-display text-xl tracking-wide"
              style={{ color: "var(--site-text)" }}
            >
              {p.title}
            </h2>
          ) : null}
          <HomeServicesGrid
            services={services}
            gridCols={(p.gridCols as 1 | 2 | 3 | undefined) ?? 3}
            themed
          />
        </div>
      );
    case "team":
      if (barbers.length === 0) {
        return (
          <div
            className={cn(
              "flex items-center justify-center rounded-xl border border-dashed text-sm opacity-60",
              className,
            )}
            style={{
              ...style,
              borderColor: "var(--site-secondary)",
              color: "var(--site-text)",
            }}
          >
            Sem profissionais na home
          </div>
        );
      }
      return (
        <div
          className={cn("overflow-auto rounded-xl p-3", className)}
          style={{
            ...style,
            backgroundColor: "color-mix(in srgb, var(--site-surface) 80%, transparent)",
            color: "var(--site-text)",
          }}
        >
          {p.title ? (
            <h2
              className="mb-3 font-display text-xl tracking-wide"
              style={{ color: "var(--site-text)" }}
            >
              {p.title}
            </h2>
          ) : null}
          <HomeBarbersGrid
            barbers={barbers}
            shopName={org.name}
            gridCols={(p.gridCols as 1 | 2 | 3 | undefined) ?? 3}
          />
        </div>
      );
    case "contact":
      return (
        <div
          className={cn("overflow-auto rounded-xl p-3", className)}
          style={{
            ...style,
            backgroundColor: "color-mix(in srgb, var(--site-surface) 80%, transparent)",
            color: "var(--site-text)",
          }}
        >
          {p.title ? (
            <h2
              className="mb-3 font-display text-xl tracking-wide"
              style={{ color: "var(--site-text)" }}
            >
              {p.title}
            </h2>
          ) : null}
          <HomeContactGrid
            units={units}
            bookHref={bookHref}
            shopName={org.name}
            sloganPrimary={slogans.primary}
            sloganSecondary={slogans.secondary}
            phoneLabel={org.phoneLabel}
            whatsappHref={org.whatsappHref}
            instagramHref={org.instagramHref}
            schedule={p.schedule ?? null}
            gridCols={2}
          />
        </div>
      );
    case "footer":
      return (
        <div className={cn("overflow-hidden", className)} style={style}>
          <SiteFooter
            brandName={org.name}
            pitch={slogans.secondary}
            logoUrl={org.logoUrl}
            whatsappHref={org.whatsappHref}
            instagramHref={org.instagramHref}
            showPitch={p.showPitch !== false}
          />
        </div>
      );
    case "hero": {
      const href = resolveHref(p.href, bookHref, homeHref);
      const overlay = p.overlay ?? 0.45;
      return (
        <div
          className={cn("relative overflow-hidden", className)}
          style={{
            ...style,
            backgroundColor: resolveCanvasColor(
              p.backgroundColor,
              "var(--site-surface)",
            ),
            borderRadius: p.borderRadius ?? 0,
          }}
        >
          {p.mediaUrl ? (
            <CanvasMediaFill url={p.mediaUrl} absolute />
          ) : null}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0,0,0,${overlay})` }}
          />
          <div className="relative z-10 flex h-full flex-col justify-end gap-3 p-6 md:p-10">
            {p.eyebrow ? (
              <p className="text-xs font-semibold tracking-[0.2em] text-brand-300 uppercase">
                {p.eyebrow}
              </p>
            ) : null}
            <h1
              className="font-display text-3xl tracking-wide uppercase md:text-5xl"
              style={{
                color: resolveCanvasColor(p.color, "var(--site-text)"),
              }}
            >
              {p.title || org.name}
            </h1>
            {p.description ? (
              <p className="max-w-xl text-sm opacity-80 md:text-base">
                {p.description}
              </p>
            ) : null}
            <Link
              href={href}
              className="mt-2 inline-flex w-fit items-center rounded-full px-5 py-2.5 text-sm font-bold"
              style={{
                backgroundColor: "var(--color-brand-500)",
                color: "var(--site-on-primary)",
              }}
            >
              {p.ctaLabel || "Agendar"}
            </Link>
          </div>
        </div>
      );
    }
    case "panel": {
      const accent =
        p.variant === "accent"
          ? ({
              borderLeftWidth: p.thickness ?? 3,
              borderLeftStyle: "solid" as const,
              borderLeftColor: resolveCanvasColor(
                p.borderColor,
                "var(--color-brand-500)",
              ),
            } satisfies React.CSSProperties)
          : {};
      return (
        <div
          className={cn("flex flex-col justify-center overflow-hidden", className)}
          style={{
            ...style,
            backgroundColor: resolveCanvasColor(
              p.backgroundColor,
              "var(--site-surface)",
            ),
            border:
              p.variant === "accent"
                ? undefined
                : `1px solid ${resolveCanvasColor(
                    p.borderColor,
                    "color-mix(in srgb, var(--site-text) 12%, transparent)",
                  )}`,
            borderRadius: p.borderRadius ?? 20,
            padding: p.padding ?? 24,
            color: resolveCanvasColor(p.color, "var(--site-text)"),
            ...accent,
          }}
        >
          {p.title ? (
            <h3 className="font-display text-xl tracking-wide">{p.title}</h3>
          ) : null}
          {p.description ? (
            <p className="mt-2 text-sm leading-relaxed opacity-70">
              {p.description}
            </p>
          ) : null}
          {p.text ? (
            <p className="mt-3 whitespace-pre-wrap text-sm">{p.text}</p>
          ) : null}
        </div>
      );
    }
    case "grid": {
      const cols = (p.gridCols as 1 | 2 | 3 | 4 | undefined) ?? 3;
      const cards =
        p.cards?.length
          ? p.cards
          : [
              { title: "Item 1", description: "Descrição", emoji: "•" },
              { title: "Item 2", description: "Descrição", emoji: "•" },
              { title: "Item 3", description: "Descrição", emoji: "•" },
            ];
      return (
        <div
          className={cn("overflow-auto p-2", className)}
          style={{
            ...style,
            color: resolveCanvasColor(p.color, "var(--site-text)"),
          }}
        >
          {p.title ? (
            <h2 className="mb-3 font-display text-xl tracking-wide">{p.title}</h2>
          ) : null}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {cards.map((card, i) => (
              <article
                key={`${card.title}-${i}`}
                className="rounded-2xl border p-4"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--site-surface) 90%, transparent)",
                  borderColor:
                    "color-mix(in srgb, var(--site-text) 12%, transparent)",
                }}
              >
                {card.emoji ? (
                  <span className="text-lg" aria-hidden>
                    {card.emoji}
                  </span>
                ) : null}
                <h3 className="mt-1 text-sm font-semibold">{card.title}</h3>
                {card.description ? (
                  <p className="mt-1 text-xs leading-relaxed opacity-70">
                    {card.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      );
    }
    case "divider":
      return (
        <div className={cn("flex items-center", className)} style={style}>
          <div
            className="w-full"
            style={{
              height: p.thickness ?? 1,
              backgroundColor: resolveCanvasColor(
                p.color,
                "var(--site-secondary)",
              ),
            }}
          />
        </div>
      );
    case "badge": {
      const borderW = p.borderWidth ?? 0;
      return (
        <div className={cn("flex items-center", className)} style={style}>
          <span
            className="inline-flex h-full w-full items-center justify-center px-3 text-center"
            style={{
              backgroundColor: resolveCanvasColor(
                p.backgroundColor,
                "var(--color-brand-500)",
              ),
              color: resolveCanvasColor(p.color, "var(--site-on-primary)"),
              borderRadius: p.borderRadius ?? 999,
              fontSize: p.fontSize ?? 13,
              fontWeight: p.fontWeight ?? 700,
              borderWidth: borderW,
              borderStyle: borderW > 0 ? "solid" : undefined,
              borderColor:
                borderW > 0
                  ? resolveCanvasColor(p.borderColor, "var(--color-brand-500)")
                  : undefined,
              boxSizing: "border-box",
            }}
          >
            {p.text || "Badge"}
          </span>
        </div>
      );
    }
    case "spacer":
      return (
        <div
          className={cn(className)}
          style={{
            ...style,
            backgroundColor: p.backgroundColor || "transparent",
          }}
          aria-hidden
        />
      );
    default: {
      const _e: never = element.type;
      void _e;
      return null;
    }
  }
}

function useArtboard(): CanvasArtboardId {
  const [artboard, setArtboard] = useState<CanvasArtboardId>("desktop");
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setArtboard(mq.matches ? "mobile" : "desktop");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return artboard;
}

type Props = {
  org: OrganizationPublic;
  canvas: SiteCanvasConfig;
  services: ServiceSummary[];
  barbers: PublicBarber[];
  units: UnitInfo[];
  slogans: { primary: string; secondary: string };
};

/**
 * Site institucional a partir de siteJson v2 (canvas absoluto).
 */
export function TenantCanvasRenderer({
  org,
  canvas,
  services,
  barbers,
  units,
  slogans,
}: Props) {
  const artboardId = useArtboard();
  const board = canvas.artboards[artboardId];
  const elements = elementsForArtboard(canvas, artboardId);
  const homeHref = `/${org.slug}`;
  const bookHref = `/${org.slug}/agendar`;
  const ctx: Ctx = {
    org,
    services,
    barbers,
    units,
    homeHref,
    bookHref,
    slogans,
  };

  return (
    <div
      className="relative w-full"
      style={{
        ...canvasThemeStyle(canvas.theme, org.primaryColor),
        aspectRatio: `${board.width} / ${board.height}`,
        minHeight: "100svh",
      }}
      data-artboard={artboardId}
    >
      {elements.map((el) => (
        <CanvasElementView key={el.id} element={el} board={board} ctx={ctx} />
      ))}
    </div>
  );
}

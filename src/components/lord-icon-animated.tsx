"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Player } from "@lordicon/react";
import { useReducedMotion } from "framer-motion";

import type { LordIconSlot } from "@/lib/lordicon-slots";

type LordIconAnimatedProps = {
  slot: LordIconSlot;
  size?: number;
  className?: string;
  /** Passed to Player `colors` when supported by the icon */
  colors?: string;
  /** Acessibilidade; vazio = decorativo (use dentro de controlo com texto visível) */
  label: string;
  fallback?: React.ReactNode;
  /** When true (e.g. parent link hover), play animation without hovering the icon itself */
  siblingHover?: boolean;
};

export function LordIconAnimated({
  slot,
  size = 40,
  className,
  colors = "primary:#fcd34d,secondary:#a1a1aa",
  label,
  fallback = null,
  siblingHover = false,
}: LordIconAnimatedProps) {
  const reduceMotion = useReducedMotion();
  const playerRef = useRef<Player>(null);
  const [icon, setIcon] = useState<object | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [selfHover, setSelfHover] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIcon(null);
    setShowFallback(false);

    fetch(`/api/lordicon/icon?slot=${encodeURIComponent(slot)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as object;
      })
      .then((data) => {
        if (!cancelled) setIcon(data);
      })
      .catch(() => {
        if (!cancelled) setShowFallback(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slot]);

  const shouldAnimate = !reduceMotion && (selfHover || siblingHover);

  useEffect(() => {
    if (!icon || !playerRef.current) return;
    if (shouldAnimate) playerRef.current.playFromBeginning();
    else playerRef.current.goToFirstFrame();
  }, [shouldAnimate, icon]);

  const onEnter = useCallback(() => {
    setSelfHover(true);
  }, []);

  const onLeave = useCallback(() => {
    setSelfHover(false);
  }, []);

  if (showFallback && fallback) {
    return <span className={className}>{fallback}</span>;
  }

  if (!icon) {
    return (
      <span
        className={className}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  const decorative = label.trim().length === 0;

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={`inline-flex shrink-0 items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      <Player ref={playerRef} icon={icon} size={size} colors={colors} />
    </span>
  );
}

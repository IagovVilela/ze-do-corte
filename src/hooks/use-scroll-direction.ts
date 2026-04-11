"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ScrollDirection = "up" | "down" | null;

type UseScrollDirectionOptions = {
  /** Pixels mínimos de scroll antes de trocar a direção. Evita flickering. */
  threshold?: number;
  /** Se true, ignora o scroll quando estiver perto do topo (< topMargin). */
  topMargin?: number;
};

type ScrollState = {
  /** Direção atual do scroll. */
  direction: ScrollDirection;
  /** Se o scroll passou do topo (para aplicar blur/borda). */
  pastTop: boolean;
  /** Posição Y atual do scroll. */
  scrollY: number;
};

/**
 * Hook que detecta a direção do scroll com threshold para evitar flickering.
 *
 * - `direction === "down"` → esconder navbar
 * - `direction === "up"` → mostrar navbar
 * - `pastTop` → aplicar backdrop-blur e borda
 *
 * Respeita performance: usa `passive: true` e debounce interno via threshold.
 */
export function useScrollDirection({
  threshold = 12,
  topMargin = 64,
}: UseScrollDirectionOptions = {}): ScrollState {
  const [state, setState] = useState<ScrollState>({
    direction: null,
    pastTop: false,
    scrollY: 0,
  });

  const lastScrollY = useRef(0);
  const lastDirection = useRef<ScrollDirection>(null);
  const ticking = useRef(false);

  const update = useCallback(() => {
    const currentY = window.scrollY;
    const diff = currentY - lastScrollY.current;

    let newDirection = lastDirection.current;

    // Perto do topo → sempre mostrar
    if (currentY < topMargin) {
      newDirection = null;
    } else if (diff > threshold) {
      // Rolando para baixo
      newDirection = "down";
      lastScrollY.current = currentY;
    } else if (diff < -threshold) {
      // Rolando para cima
      newDirection = "up";
      lastScrollY.current = currentY;
    }

    const pastTop = currentY > 20;

    if (newDirection !== lastDirection.current || pastTop !== state.pastTop) {
      lastDirection.current = newDirection;
      setState({ direction: newDirection, pastTop, scrollY: currentY });
    }

    ticking.current = false;
  }, [threshold, topMargin, state.pastTop]);

  useEffect(() => {
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Checar estado inicial
    update();

    return () => window.removeEventListener("scroll", onScroll);
  }, [update]);

  return state;
}

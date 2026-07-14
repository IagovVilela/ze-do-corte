"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";

import type { SiteCanvasConfig } from "@/lib/site-canvas";

const MAX_HISTORY = 80;
const COALESCE_MS = 400;

function cloneCanvas(c: SiteCanvasConfig): SiteCanvasConfig {
  return structuredClone(c);
}

function sameCanvas(a: SiteCanvasConfig, b: SiteCanvasConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function resolveNext(
  prev: SiteCanvasConfig,
  updater: SetStateAction<SiteCanvasConfig>,
): SiteCanvasConfig {
  return typeof updater === "function" ? updater(prev) : updater;
}

/**
 * Histórico undo/redo no estilo Canva:
 * - arrastar/redimensionar = um único passo (gesture)
 * - digitação no inspector = passos agrupados (~400ms)
 * - add/delete/tema/modelo = passo imediato
 */
export function useCanvasHistory(initial: SiteCanvasConfig) {
  const [canvas, setCanvasState] = useState(initial);
  const [historyTick, setHistoryTick] = useState(0);

  const presentRef = useRef(canvas);
  const pastRef = useRef<SiteCanvasConfig[]>([]);
  const futureRef = useRef<SiteCanvasConfig[]>([]);
  const gestureBaselineRef = useRef<SiteCanvasConfig | null>(null);
  const coalesceBaselineRef = useRef<SiteCanvasConfig | null>(null);
  const coalesceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    presentRef.current = canvas;
  }, [canvas]);

  const bump = useCallback(() => setHistoryTick((n) => n + 1), []);

  const clearCoalesceTimer = useCallback(() => {
    if (coalesceTimerRef.current) {
      clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = null;
    }
  }, []);

  const pushPast = useCallback(
    (snapshot: SiteCanvasConfig) => {
      pastRef.current.push(snapshot);
      if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
      futureRef.current = [];
      bump();
    },
    [bump],
  );

  const flushCoalesce = useCallback(() => {
    clearCoalesceTimer();
    if (coalesceBaselineRef.current) {
      if (!sameCanvas(coalesceBaselineRef.current, presentRef.current)) {
        pushPast(coalesceBaselineRef.current);
      }
      coalesceBaselineRef.current = null;
    }
  }, [clearCoalesceTimer, pushPast]);

  const beginInteraction = useCallback(() => {
    flushCoalesce();
    if (!gestureBaselineRef.current) {
      gestureBaselineRef.current = cloneCanvas(presentRef.current);
    }
  }, [flushCoalesce]);

  const endInteraction = useCallback(() => {
    const baseline = gestureBaselineRef.current;
    gestureBaselineRef.current = null;
    if (baseline && !sameCanvas(baseline, presentRef.current)) {
      pushPast(baseline);
    }
  }, [pushPast]);

  /** Atualiza o canvas (agrupa mudanças rápidas em um passo de histórico). */
  const setCanvas = useCallback(
    (updater: SetStateAction<SiteCanvasConfig>) => {
      setCanvasState((prev) => {
        const next = resolveNext(prev, updater);
        if (sameCanvas(next, prev)) return prev;

        if (gestureBaselineRef.current) {
          return next;
        }

        if (!coalesceBaselineRef.current) {
          coalesceBaselineRef.current = cloneCanvas(prev);
        }
        clearCoalesceTimer();
        coalesceTimerRef.current = setTimeout(() => {
          flushCoalesce();
        }, COALESCE_MS);

        return next;
      });
    },
    [clearCoalesceTimer, flushCoalesce],
  );

  /** Um passo de histórico imediato (add, delete, tema, modelo…). */
  const commitCanvas = useCallback(
    (updater: SetStateAction<SiteCanvasConfig>) => {
      flushCoalesce();
      gestureBaselineRef.current = null;
      setCanvasState((prev) => {
        const next = resolveNext(prev, updater);
        if (sameCanvas(next, prev)) return prev;
        pushPast(cloneCanvas(prev));
        return next;
      });
    },
    [flushCoalesce, pushPast],
  );

  /** Substitui sem histórico (carregamento do servidor / após salvar). */
  const replaceCanvas = useCallback(
    (next: SiteCanvasConfig) => {
      clearCoalesceTimer();
      coalesceBaselineRef.current = null;
      gestureBaselineRef.current = null;
      pastRef.current = [];
      futureRef.current = [];
      setCanvasState(next);
      bump();
    },
    [bump, clearCoalesceTimer],
  );

  const undo = useCallback(() => {
    flushCoalesce();
    gestureBaselineRef.current = null;
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push(cloneCanvas(presentRef.current));
    setCanvasState(previous);
    bump();
  }, [bump, flushCoalesce]);

  const redo = useCallback(() => {
    flushCoalesce();
    gestureBaselineRef.current = null;
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(cloneCanvas(presentRef.current));
    setCanvasState(next);
    bump();
  }, [bump, flushCoalesce]);

  useEffect(() => {
    return () => clearCoalesceTimer();
  }, [clearCoalesceTimer]);

  void historyTick;

  return {
    canvas,
    setCanvas,
    commitCanvas,
    replaceCanvas,
    beginInteraction,
    endInteraction,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}

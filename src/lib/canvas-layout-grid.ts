/**
 * Grade de layout do editor de canvas (snap + guias).
 * Um único passo = drag, overlay e "alinhar à grade".
 */

export const CANVAS_SNAP_GRID = 8;

/** Distância em px do arteboard para grudar em centro/borda (estilo Canva). */
export const CANVAS_GUIDE_THRESHOLD = 8;

export type CanvasFrameBox = { x: number; y: number; w: number; h: number };

export type SmartGuide = { axis: "v" | "h"; pos: number };

export function snapToGrid(
  n: number,
  grid: number = CANVAS_SNAP_GRID,
): number {
  return Math.round(n / grid) * grid;
}

export function snapFrameToGrid(
  frame: CanvasFrameBox,
  grid: number = CANVAS_SNAP_GRID,
): CanvasFrameBox {
  const w = Math.max(grid, snapToGrid(frame.w, grid));
  const h = Math.max(grid, snapToGrid(frame.h, grid));
  return {
    x: snapToGrid(frame.x, grid),
    y: snapToGrid(frame.y, grid),
    w,
    h,
  };
}

export type ArtboardAlign =
  | "left"
  | "centerX"
  | "right"
  | "top"
  | "centerY"
  | "bottom";

export function alignFrameToArtboard(
  frame: CanvasFrameBox,
  board: { width: number; height: number },
  align: ArtboardAlign,
  grid: number = CANVAS_SNAP_GRID,
): CanvasFrameBox {
  let { x, y, w, h } = frame;
  switch (align) {
    case "left":
      x = 0;
      break;
    case "centerX":
      x = (board.width - w) / 2;
      break;
    case "right":
      x = board.width - w;
      break;
    case "top":
      y = 0;
      break;
    case "centerY":
      y = (board.height - h) / 2;
      break;
    case "bottom":
      y = board.height - h;
      break;
    default: {
      const _exhaustive: never = align;
      return _exhaustive;
    }
  }
  return snapFrameToGrid({ x, y, w, h }, grid);
}

/**
 * Ajusta X/Y para grudar em centro/bordas do arteboard e de outros elementos.
 * Retorna o frame e as linhas-guia ativas (estilo Canva).
 */
export function snapFrameWithSmartGuides(
  frame: CanvasFrameBox,
  board: { width: number; height: number },
  peers: CanvasFrameBox[],
  threshold: number = CANVAS_GUIDE_THRESHOLD,
): { frame: CanvasFrameBox; guides: SmartGuide[] } {
  const left = frame.x;
  const right = frame.x + frame.w;
  const cx = frame.x + frame.w / 2;
  const top = frame.y;
  const bottom = frame.y + frame.h;
  const cy = frame.y + frame.h / 2;

  const vGuides = [
    0,
    board.width / 2,
    board.width,
    ...peers.flatMap((p) => [p.x, p.x + p.w / 2, p.x + p.w]),
  ];
  const hGuides = [
    0,
    board.height / 2,
    board.height,
    ...peers.flatMap((p) => [p.y, p.y + p.h / 2, p.y + p.h]),
  ];

  let nextX = frame.x;
  let nextY = frame.y;
  const guides: SmartGuide[] = [];

  type HitV = { dist: number; guide: number; x: number };
  let bestV: HitV | null = null;
  for (const g of vGuides) {
    const opts: { pos: number; x: number }[] = [
      { pos: left, x: g },
      { pos: cx, x: g - frame.w / 2 },
      { pos: right, x: g - frame.w },
    ];
    for (const o of opts) {
      const dist = Math.abs(o.pos - g);
      if (dist > threshold) continue;
      if (!bestV || dist < bestV.dist) {
        bestV = { dist, guide: g, x: o.x };
      }
    }
  }
  if (bestV) {
    nextX = bestV.x;
    guides.push({ axis: "v", pos: bestV.guide });
  }

  type HitH = { dist: number; guide: number; y: number };
  let bestH: HitH | null = null;
  for (const g of hGuides) {
    const opts: { pos: number; y: number }[] = [
      { pos: top, y: g },
      { pos: cy, y: g - frame.h / 2 },
      { pos: bottom, y: g - frame.h },
    ];
    for (const o of opts) {
      const dist = Math.abs(o.pos - g);
      if (dist > threshold) continue;
      if (!bestH || dist < bestH.dist) {
        bestH = { dist, guide: g, y: o.y };
      }
    }
  }
  if (bestH) {
    nextY = bestH.y;
    guides.push({ axis: "h", pos: bestH.guide });
  }

  const snapped = {
    ...frame,
    x: bestV ? Math.round(nextX) : snapToGrid(nextX),
    y: bestH ? Math.round(nextY) : snapToGrid(nextY),
  };

  return { frame: snapped, guides };
}

/** Linhas-guia quando o elemento já está centralizado (só visual). */
export function guidesForCenteredFrame(
  frame: CanvasFrameBox,
  board: { width: number; height: number },
  tolerance: number = 2,
): SmartGuide[] {
  const guides: SmartGuide[] = [];
  const cx = frame.x + frame.w / 2;
  const cy = frame.y + frame.h / 2;
  if (Math.abs(cx - board.width / 2) <= tolerance) {
    guides.push({ axis: "v", pos: board.width / 2 });
  }
  if (Math.abs(cy - board.height / 2) <= tolerance) {
    guides.push({ axis: "h", pos: board.height / 2 });
  }
  return guides;
}

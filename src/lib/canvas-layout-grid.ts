/**
 * Grade de layout do editor de canvas (snap + guias).
 * Um único passo = drag, overlay e "alinhar à grade".
 */

export const CANVAS_SNAP_GRID = 8;

export type CanvasFrameBox = { x: number; y: number; w: number; h: number };

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

import { COLOR_COUNT, COLS, PATH_MIN, ROWS } from './config';
import type { BoardLayout } from './settings';

export type Cell = { row: number; col: number };

/** 四邻：上 / 下 / 左 / 右。对角非法。 */
export const NEIGHBOR4: Cell[] = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: -1, col: 0 },
];

export function isOrthoAdjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function inBounds(cell: Cell): boolean {
  return cell.row >= 0 && cell.row < ROWS && cell.col >= 0 && cell.col < COLS;
}

export function cellCenter(cell: Cell, left: number, top: number, layout: BoardLayout): { x: number; y: number } {
  const sx = layout.cellW + layout.spacing;
  const sy = layout.cellH + layout.spacing;
  return {
    x: left + cell.col * sx + layout.cellW / 2,
    y: top + cell.row * sy + layout.cellH / 2,
  };
}

/** 逻辑盘局部坐标（原点 = 格子区左上）。 */
export function cellFromLocal(localX: number, localY: number, layout: BoardLayout): Cell | null {
  const sx = layout.cellW + layout.spacing;
  const sy = layout.cellH + layout.spacing;
  if (sx <= 0 || sy <= 0) return null;
  const hitR = Math.min(layout.cellW, layout.cellH) * 0.8;
  const approxCol = Math.floor(localX / sx);
  const approxRow = Math.floor(localY / sy);
  let best: Cell | null = null;
  let bestD = Infinity;
  for (let row = Math.max(0, approxRow - 1); row <= Math.min(ROWS - 1, approxRow + 1); row++) {
    for (let col = Math.max(0, approxCol - 1); col <= Math.min(COLS - 1, approxCol + 1); col++) {
      const cx = col * sx + layout.cellW / 2;
      const cy = row * sy + layout.cellH / 2;
      const d = (localX - cx) ** 2 + (localY - cy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { row, col };
      }
    }
  }
  if (!best || Math.sqrt(bestD) > hitR) return null;
  return best;
}

/** Four-way connected component size. Size ≥ PATH_MIN ⇒ a same-color orthogonal path exists. */
export function maxComponentSize(colors: number[][]): number {
  const seen = Array.from({ length: ROWS }, () => Array<boolean>(COLS).fill(false));
  let max = 0;
  const stack: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (seen[row]![col]) continue;
      const color = colors[row]![col]!;
      let size = 0;
      stack.push({ row, col });
      seen[row]![col] = true;
      while (stack.length) {
        const cur = stack.pop()!;
        size += 1;
        for (const d of NEIGHBOR4) {
          const n = { row: cur.row + d.row, col: cur.col + d.col };
          if (!inBounds(n) || seen[n.row]![n.col] || colors[n.row]![n.col] !== color) continue;
          seen[n.row]![n.col] = true;
          stack.push(n);
        }
      }
      max = Math.max(max, size);
    }
  }
  return max;
}

function randomFill(rng: () => number): number[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => Math.floor(rng() * COLOR_COUNT)),
  );
}

function forceMinPath(colors: number[][]): void {
  const row = Math.min(ROWS - 1, 4);
  const col = Math.min(COLS - PATH_MIN, 3);
  const c = colors[row]![col]!;
  for (let i = 1; i < PATH_MIN; i++) colors[row]![col + i] = c;
}

export function createFilledBoard(rng: () => number = Math.random): number[][] {
  for (let i = 0; i < 40; i++) {
    const colors = randomFill(rng);
    if (maxComponentSize(colors) >= PATH_MIN) return colors;
  }
  const colors = randomFill(rng);
  forceMinPath(colors);
  return colors;
}



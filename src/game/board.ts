import { COLOR_COUNT, COLS, ROWS } from './config';
import type { BoardLayout } from './settings';

export type Cell = { row: number; col: number };

const NEIGHBOR8: Cell[] = [];
for (let dr = -1; dr <= 1; dr++) {
  for (let dc = -1; dc <= 1; dc++) {
    if (dr === 0 && dc === 0) continue;
    NEIGHBOR8.push({ row: dr, col: dc });
  }
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

/** Eight-way connected component size. Size ≥ 3 ⇒ a same-color path of length ≥ 3 exists. */
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
        for (const d of NEIGHBOR8) {
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

function forcePath3(colors: number[][]): void {
  const row = 4;
  const col = 3;
  const c = colors[row]![col]!;
  colors[row]![col + 1] = c;
  colors[row]![col + 2] = c;
}

export function createFilledBoard(rng: () => number = Math.random): number[][] {
  for (let i = 0; i < 40; i++) {
    const colors = randomFill(rng);
    if (maxComponentSize(colors) >= 3) return colors;
  }
  const colors = randomFill(rng);
  forcePath3(colors);
  return colors;
}



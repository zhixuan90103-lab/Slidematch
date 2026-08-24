/**
 * 道具。规则真源：docs/ITEMS.md；数字：design.ts RULES。
 * 抬手只调用一次 resolveStroke，散消与生成不要在别处重算。
 */

import { inBounds, NEIGHBOR4, type Cell } from './board';
import {
  COLS,
  CONVERT_COLOR,
  ITEM_MIN,
  MAGIC_COLOR,
  MAGIC_MIN,
  ROWS,
  isConvertColor,
  isItemColor,
  isMagicColor,
} from './config';

export type StrokePath = {
  cells: Cell[];
  color: number;
  magic: boolean;
};

export type StrokeResolve = {
  extraCells: Cell[];
  spawnColor: number | null;
};

export function displayColor(color: number, magicLook: boolean): number {
  return magicLook ? MAGIC_COLOR : color;
}

export function cellColorAt(colors: number[][], cell: Cell): number {
  return colors[cell.row]![cell.col]!;
}

function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}

export function pathUsesItem(path: StrokePath, colors: number[][]): boolean {
  return path.cells.some((c) => isItemColor(cellColorAt(colors, c)));
}

export function pathUsesMagic(path: StrokePath, colors: number[][]): boolean {
  return path.magic || path.cells.some((c) => isMagicColor(cellColorAt(colors, c)));
}

export function pathUsesConvert(path: StrokePath, colors: number[][]): boolean {
  return path.cells.some((c) => isConvertColor(cellColorAt(colors, c)));
}

export function spawnColorForStroke(path: StrokePath, colors: number[][]): number | null {
  if (pathUsesItem(path, colors)) return null;
  if (path.cells.length >= MAGIC_MIN) return MAGIC_COLOR;
  if (path.cells.length >= ITEM_MIN) return CONVERT_COLOR;
  return null;
}

/** 路径视为已空：四邻没有同锁定色（且不在路径上）→ 落单。 */
function isIsolated(cell: Cell, want: number, colors: number[][], onPath: Set<string>): boolean {
  for (const d of NEIGHBOR4) {
    const n: Cell = { row: cell.row + d.row, col: cell.col + d.col };
    if (!inBounds(n) || onPath.has(cellKey(n))) continue;
    if (colors[n.row]![n.col] === want) return false;
  }
  return true;
}

/**
 * 变色散消：不在路径上的锁定色，落单优先、行列次序，最多 N=路径长。
 * 含魔法或无变色或未锁色 → 空。
 */
export function extraClearCells(path: StrokePath, colors: number[][]): Cell[] {
  if (pathUsesMagic(path, colors) || !pathUsesConvert(path, colors) || path.color < 0) return [];
  const want = path.color;
  const onPath = new Set(path.cells.map(cellKey));
  const isolated: Cell[] = [];
  const clustered: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (onPath.has(`${row},${col}`)) continue;
      if (colors[row]![col] !== want) continue;
      const cell = { row, col };
      (isIsolated(cell, want, colors, onPath) ? isolated : clustered).push(cell);
    }
  }
  return isolated.concat(clustered).slice(0, path.cells.length);
}

export function resolveStroke(path: StrokePath, colors: number[][]): StrokeResolve {
  return {
    extraCells: extraClearCells(path, colors),
    spawnColor: spawnColorForStroke(path, colors),
  };
}

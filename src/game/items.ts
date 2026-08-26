/**
 * 道具。规则真源：docs/ITEMS.md；数字：design.ts RULES。
 * 抬手只调用一次 resolveStroke，散消与生成不要在别处重算。
 */

import { inBounds, NEIGHBOR4, type Cell } from './board';
import {
  COLS,
  CONVERT_COLOR,
  COIN_LOOK,
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
  return magicLook ? COIN_LOOK : color;
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
  if (pathUsesMagic(path, colors)) return null;
  if (path.cells.length >= MAGIC_MIN) return MAGIC_COLOR;
  if (pathUsesConvert(path, colors)) return null;
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

/** 四邻是否贴着路径（含任意色路径格）。 */
function touchesPath(cell: Cell, onPath: Set<string>): boolean {
  for (const d of NEIGHBOR4) {
    const n: Cell = { row: cell.row + d.row, col: cell.col + d.col };
    if (onPath.has(cellKey(n))) return true;
  }
  return false;
}

function minPathDist(cell: Cell, pathCells: Cell[]): number {
  let best = Infinity;
  for (let i = 0; i < pathCells.length; i++) {
    const p = pathCells[i]!;
    const d = Math.abs(p.row - cell.row) + Math.abs(p.col - cell.col);
    if (d < best) best = d;
  }
  return best;
}

/** 成团按连通块打包；离路径近的团排前面（回退时先丢掉远处的团）。 */
function packClusters(cells: Cell[], pathCells: Cell[]): Cell[] {
  const inSet = new Set(cells.map(cellKey));
  const seen = new Set<string>();
  const groups: Cell[][] = [];
  for (const start of cells) {
    const sk = cellKey(start);
    if (seen.has(sk)) continue;
    const group: Cell[] = [];
    const stack = [start];
    seen.add(sk);
    while (stack.length) {
      const cur = stack.pop()!;
      group.push(cur);
      for (const d of NEIGHBOR4) {
        const n: Cell = { row: cur.row + d.row, col: cur.col + d.col };
        const nk = cellKey(n);
        if (!inSet.has(nk) || seen.has(nk)) continue;
        seen.add(nk);
        stack.push(n);
      }
    }
    group.sort((a, b) => a.row - b.row || a.col - b.col);
    groups.push(group);
  }
  groups.sort((a, b) => {
    const da = Math.min(...a.map((c) => minPathDist(c, pathCells)));
    const db = Math.min(...b.map((c) => minPathDist(c, pathCells)));
    if (da !== db) return da - db;
    return a[0]!.row - b[0]!.row || a[0]!.col - b[0]!.col;
  });
  return groups.flat();
}

function keepRank(cell: Cell, want: number, colors: number[][], onPath: Set<string>, pathCells: Cell[]): number {
  const touch = touchesPath(cell, onPath);
  const lone = isIsolated(cell, want, colors, onPath);
  const dist = minPathDist(cell, pathCells);
  if (lone && !touch) return dist * 0.01;
  if (!touch) return 100 + dist;
  return 1000 + dist;
}

function collectCandidates(want: number, colors: number[][], onPath: Set<string>): Cell[] {
  const out: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (onPath.has(`${row},${col}`)) continue;
      if (colors[row]![col] !== want) continue;
      out.push({ row, col });
    }
  }
  return out;
}

function addOrder(cells: Cell[], want: number, colors: number[][], onPath: Set<string>, pathCells: Cell[]): Cell[] {
  const iso: Cell[] = [];
  const far: Cell[] = [];
  const touch: Cell[] = [];
  for (const cell of cells) {
    if (touchesPath(cell, onPath)) touch.push(cell);
    else if (isIsolated(cell, want, colors, onPath)) iso.push(cell);
    else far.push(cell);
  }
  return iso.concat(packClusters(far, pathCells), packClusters(touch, pathCells));
}

/**
 * 变色散消：锁定色、不在路径上。名额 N=路径长，能凑满就凑满。
 * 已标记的只要还在盘上且未进路径就尽量保留（贴路径不立刻摘点）。
 * 回退时先丢掉远处的团。新名额优先落单、再近团、不够才用贴路径的。
 */
export function extraClearCells(path: StrokePath, colors: number[][], prev: Cell[] = []): Cell[] {
  if (pathUsesMagic(path, colors) || !pathUsesConvert(path, colors) || path.color < 0) return [];
  const want = path.color;
  const n = path.cells.length;
  const onPath = new Set(path.cells.map(cellKey));
  const candidates = collectCandidates(want, colors, onPath);
  const candKeys = new Set(candidates.map(cellKey));
  const kept = prev.filter((c) => candKeys.has(cellKey(c)));
  if (kept.length > n) {
    kept.sort(
      (a, b) =>
        keepRank(a, want, colors, onPath, path.cells) - keepRank(b, want, colors, onPath, path.cells) ||
        a.row - b.row ||
        a.col - b.col,
    );
    return kept.slice(0, n);
  }
  if (kept.length === n) return kept;
  const used = new Set(kept.map(cellKey));
  const rest = candidates.filter((c) => !used.has(cellKey(c)));
  const add = addOrder(rest, want, colors, onPath, path.cells);
  const out = kept.slice();
  for (let i = 0; i < add.length && out.length < n; i++) out.push(add[i]!);
  return out;
}

export function resolveStroke(path: StrokePath, colors: number[][], prevExtras: Cell[] = []): StrokeResolve {
  return {
    extraCells: extraClearCells(path, colors, prevExtras),
    spawnColor: spawnColorForStroke(path, colors),
  };
}

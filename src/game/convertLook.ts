/**
 * 显示层：换锁色 / 魔法白板。规则见 docs/FEEDBACK.md「翻牌（共用规格）」。
 * 只换贴图；逻辑色仍是 piece.color。生命周期跟这一颗的 id（出池必须换新 id）。
 */

import { COIN_LOOK, isConvertColor, isItemColor, isMagicColor } from './config';
import { cellColorAt, pathUsesConvert } from './items';
import type { PathState } from './path';
import type { Piece } from './drop';
import { isOrthoAdjacent, type Cell } from './board';

export type RecolorFx = {
  from: number;
  to: number;
  t: number;
  done: boolean;
};

/** 有变色、无魔法、锁色已定 → 返回锁色；否则 -1（不换贴图）。 */
export function recolorLock(path: PathState | null, colors: number[][]): number {
  if (!path || path.magic || path.color < 0) return -1;
  if (!pathUsesConvert(path, colors)) return -1;
  return path.color;
}

export function recolorWant(
  piece: Piece,
  lock: number,
  onPath: boolean,
  magicLook: boolean,
): number {
  if (magicLook) return COIN_LOOK;
  if (lock < 0 || !onPath || isItemColor(piece.color)) return piece.color;
  return lock;
}

export function firstMagicCell(path: PathState, colors: number[][]): Cell | null {
  for (const cell of path.cells) {
    if (isMagicColor(cellColorAt(colors, cell))) return cell;
  }
  return null;
}

export function chebyshev(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

/** 下一格仍可换色（未锁色或刚过变色子）。 */
export function convertFlexOpen(path: PathState): boolean {
  return path.color < 0 || path.flex;
}

function touchesPathConvert(path: PathState, colors: number[][], row: number, col: number): boolean {
  const at = { row, col };
  for (const cell of path.cells) {
    if (!isConvertColor(cellColorAt(colors, cell))) continue;
    if (isOrthoAdjacent(at, cell)) return true;
  }
  return false;
}

/**
 * 其它色变暗。点中/划到变色子且仍可换色时，其四邻可连子不暗。
 * 见 docs/FEEDBACK.md 变色子滑动中。
 */
export function pieceShouldDim(
  path: PathState | null,
  colors: number[][],
  piece: Piece,
  pathKeys: Set<string>,
  extraKeys: Set<string>,
): boolean {
  if (!path || path.magic || piece.state === 'clearing') return false;
  const row = piece.destRow ?? piece.sourceRow;
  const key = `${row},${piece.col}`;
  if (pathKeys.has(key) || extraKeys.has(key)) return false;
  if (convertFlexOpen(path) && touchesPathConvert(path, colors, row, piece.col)) return false;
  if (path.color < 0) return true;
  if (isItemColor(piece.color)) return false;
  return piece.color !== path.color;
}

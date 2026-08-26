/**
 * 显示层：换锁色 / 魔法白板。规则见 docs/FEEDBACK.md「翻牌（共用规格）」。
 * 只换贴图；逻辑色仍是 piece.color。生命周期跟这一颗的 id（出池必须换新 id）。
 */

import { COIN_LOOK, isItemColor, isMagicColor } from './config';
import { cellColorAt, pathUsesConvert } from './items';
import type { PathState } from './path';
import type { Piece } from './drop';
import type { Cell } from './board';

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

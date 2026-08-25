/**
 * 变色子换锁色的显示层。规则见 docs/FEEDBACK.md / ITEMS.md。
 * 只换贴图；逻辑色仍是 piece.color。生命周期跟这一颗棋子的 id（每次出池换新 id）。
 */

import { isItemColor } from './config';
import { pathUsesConvert } from './items';
import type { PathState } from './path';
import type { Piece } from './drop';

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

export function recolorWant(piece: Piece, lock: number, onPath: boolean): number {
  if (lock < 0 || !onPath || isItemColor(piece.color)) return piece.color;
  return lock;
}

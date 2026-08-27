/**
 * 魔法有效抬手：路径金币飞向 HUD 金币图标（位置+大小对齐）。规则见 docs/FEEDBACK.md。
 * 数字：FEEL.convert.scoreFly*。DOM 仍由 mount 挂。
 */

import { FEEL } from './config';
import type { Cell } from './board';

export type ScoreFly = {
  el: HTMLElement;
  pieceId: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  sec: number;
  delay: number;
  w: number;
  h: number;
  /** 终点缩放到 HUD 金币图标。 */
  endScale: number;
  hit: boolean;
  fade: number;
};

/** 上到下；下一行必晚于上一行所有列。同行只差 col × colStagger。 */
export function magicClearDelay(cells: Cell[]): (cell: Cell) => number {
  const ordered = cells.slice().sort((a, b) => a.row - b.row || a.col - b.col);
  const rowRank = new Map<number, number>();
  for (const cell of ordered) {
    if (!rowRank.has(cell.row)) rowRank.set(cell.row, rowRank.size);
  }
  const rowS = FEEL.convert.scoreFlyRowStagger;
  const colS = FEEL.convert.scoreFlyColStagger;
  return (cell: Cell) => (rowRank.get(cell.row) ?? 0) * rowS + cell.col * colS;
}

/** 前 1/3 放到 peak，后 2/3 收到 end。 */
export function scoreFlyScale(u: number, endScale: number = FEEL.convert.scoreFlyEndScale): number {
  const s0 = FEEL.convert.scoreFlyStartScale;
  const sPeak = FEEL.convert.scoreFlyPeakScale;
  const s1 = endScale;
  const t = Math.min(1, Math.max(0, u));
  if (t < 1 / 3) {
    const k = t / (1 / 3);
    return s0 + (sPeak - s0) * (1 - (1 - k) * (1 - k));
  }
  const k = (t - 1 / 3) / (2 / 3);
  return sPeak + (s1 - sPeak) * (k * k);
}

export function scoreFlyEase(u: number): number {
  const t = Math.min(1, Math.max(0, u));
  return 1 - (1 - t) * (1 - t);
}

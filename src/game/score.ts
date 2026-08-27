/**
 * 分数与本局金币。规则真源：docs/DESIGN.md「分数」；数字：design.ts RULES。
 *
 * 当次 = max(1, 抬手前金币) × 消除颗数。变色/魔法不另乘。
 * 滑动不加分。开始消除时 Rolling 加上当次（路径 + 散子）。
 * 金币：仅魔法有效抬手，路径每格 +coinPerMagicCell；本局从 0 起。
 */

import { RULES } from './config';
import { pathUsesMagic, type StrokePath, type StrokeResolve } from './items';

export function coinUnit(coins: number): number {
  return Math.max(RULES.scoreCoinMin, Math.max(0, coins));
}

export function scoreForCleared(cleared: number, coins: number): number {
  if (cleared < 1) return 0;
  return coinUnit(coins) * cleared;
}

export function clearedCount(path: StrokePath, settle: StrokeResolve): number {
  return path.cells.length + settle.extraCells.length;
}

export function strokeScore(path: StrokePath, settle: StrokeResolve, coins: number): number {
  return scoreForCleared(clearedCount(path, settle), coins);
}

/** 魔法路径格进本局金币；变色散消、普通划不加。 */
export function strokeCoins(path: StrokePath, colors: number[][]): number {
  if (!pathUsesMagic(path, colors)) return 0;
  return path.cells.length * RULES.coinPerMagicCell;
}

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

export type ScoreRoll = {
  committed: number;
  displayed: number;
  target: number;
  from: number;
  t: number;
  dur: number;
};

export function createScoreRoll(): ScoreRoll {
  return { committed: 0, displayed: 0, target: 0, from: 0, t: 0, dur: 0 };
}

export function setScoreTarget(roll: ScoreRoll, target: number): void {
  const next = Math.max(0, target);
  if (next === roll.target) return;
  roll.from = roll.displayed;
  roll.target = next;
  roll.t = 0;
  const delta = Math.abs(next - roll.from);
  const dur = RULES.scoreRollMinSec + delta * RULES.scoreRollPerPoint;
  roll.dur = Math.min(RULES.scoreRollMaxSec, Math.max(RULES.scoreRollMinSec, dur));
}

/** 抬手：累计加上当次，HUD 滚到新累计。 */
export function commitStroke(roll: ScoreRoll, payout: number): void {
  roll.committed = Math.max(0, roll.committed + Math.max(0, payout));
  setScoreTarget(roll, roll.committed);
}

export function tickScoreRoll(roll: ScoreRoll, dt: number): boolean {
  if (roll.displayed === roll.target && roll.t >= roll.dur) return false;
  roll.t = Math.min(roll.dur, roll.t + dt);
  if (roll.t >= roll.dur) {
    roll.displayed = roll.target;
    return false;
  }
  const u = easeOutCubic(roll.t / roll.dur);
  roll.displayed = Math.round(roll.from + (roll.target - roll.from) * u);
  return true;
}

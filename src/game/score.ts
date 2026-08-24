/**
 * 分数。规则真源：docs/DESIGN.md「分数」；数字：design.ts RULES。
 *
 * 滑动：每格 +1 预览（个位 1–9），未进累计。
 * 抬手：一次滚动到「累计 + 当次」再个位四舍五入后的值。禁止先滚到未取整再跳。
 */

import { RULES } from './config';
import { pathUsesConvert, pathUsesMagic, type StrokePath, type StrokeResolve } from './items';

export function strokeMultiplier(usedMagic: boolean, usedConvert: boolean): number {
  if (usedMagic) return RULES.scoreMagicMul;
  if (usedConvert) return RULES.scoreConvertMul;
  return 1;
}

export function scoreForCleared(cleared: number, mul: number): number {
  if (cleared < 1) return 0;
  return RULES.scoreUnit * cleared * cleared * mul;
}

export function clearedCount(path: StrokePath, settle: StrokeResolve): number {
  return path.cells.length + settle.extraCells.length;
}

export function strokeScore(path: StrokePath, colors: number[][], settle: StrokeResolve): number {
  const magic = pathUsesMagic(path, colors);
  const convert = pathUsesConvert(path, colors);
  return scoreForCleared(clearedCount(path, settle), strokeMultiplier(magic, convert));
}

/** 滑动中预览：线性、小额，抬手不算进累计。 */
export function linkPreview(pathLen: number): number {
  if (pathLen < 1) return 0;
  return pathLen * RULES.scoreLinkUnit;
}

/** 个位四舍五入到十；不足 10 的正分保留，避免首消变 0。 */
export function roundScoreOnes(n: number): number {
  if (n <= 0) return 0;
  if (n < 10) return n;
  return Math.round(n / 10) * 10;
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

/** 抬手：累计先取整，滚动目标就是取整后的值。 */
export function commitStroke(roll: ScoreRoll, payout: number): void {
  roll.committed = roundScoreOnes(roll.committed + Math.max(0, payout));
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

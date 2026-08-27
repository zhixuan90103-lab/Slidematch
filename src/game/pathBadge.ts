/**
 * 路径角标。规格真源：docs/FEEDBACK.md「路径角标」+ FEEL.select.badge。
 *
 * 普通：右上 18。队尾：顶缘居中 40。
 * 无散消抬手：一起 outSec 消失。有散消：从 1 收，每收一个队尾数字 -1。
 */

import { FEEL } from './design';
import type { Cell } from './board';

const B = FEEL.select.badge;

export type BadgeMotion = {
  x: number;
  from: number;
  to: number;
  t: number;
  vanish: boolean;
};

/** 变色散消抬手：从 1 往队尾收，队尾数字同步倒数。 */
export type BadgeCountJob = {
  cells: Cell[];
  shown: number;
  vanishAt: number;
  acc: number;
  emptyTick: number | null;
};

export function startBadgeCount(cells: Cell[]): BadgeCountJob {
  return {
    cells: cells.map((c) => ({ row: c.row, col: c.col })),
    shown: cells.length,
    vanishAt: 1,
    acc: 0,
    emptyTick: null,
  };
}

export function badgeTailCell(cells: Cell[] | undefined): Cell | undefined {
  return cells && cells.length ? cells[cells.length - 1] : undefined;
}

export function badgeIsTail(row: number, col: number, tail: Cell | undefined): boolean {
  return !!tail && tail.row === row && tail.col === col;
}

export function badgeKeep(
  job: BadgeCountJob | null,
  order: number | undefined,
  isTail: boolean,
  onPath: boolean,
): boolean {
  if (job) return isTail ? job.shown > 0 : order != null && order >= job.vanishAt;
  return onPath && order != null;
}

export function badgeLabel(job: BadgeCountJob | null, order: number | undefined, isTail: boolean): number {
  if (job && isTail) return job.shown;
  return order ?? 0;
}

/** 返回这一帧要点的散子次数（= 收掉的角标数）。散子选完后剩下的角标加速收完。 */
export function stepBadgeCount(job: BadgeCountJob, dt: number, extrasLeft: number): number {
  const slow = FEEL.convert.tickSec;
  job.acc += dt;
  let n = 0;
  while (job.shown > 0) {
    const stillExtras = extrasLeft - n > 0;
    if (!stillExtras && job.emptyTick == null) {
      job.emptyTick = Math.min(slow, FEEL.convert.tickEmptySpan / Math.max(1, job.shown));
    }
    const tick = stillExtras ? slow : (job.emptyTick ?? slow);
    if (job.acc < tick) break;
    job.acc -= tick;
    job.shown -= 1;
    job.vanishAt += 1;
    n += 1;
  }
  return n;
}

export function badgeTargetPx(keep: boolean, isNow: boolean): number {
  if (!keep) return 0;
  return isNow ? B.sizeNow : B.size;
}

function easeOut(u: number): number {
  const t = Math.min(1, Math.max(0, u));
  return 1 - (1 - t) * (1 - t);
}

export function tickBadgeMotion(
  prev: BadgeMotion | undefined,
  target: number,
  dt: number,
): BadgeMotion | null {
  const s = FEEL.select;
  const step = Math.min(dt, 1 / 30);
  const vanish = target <= 0;
  const sec = vanish ? s.outSec : B.snapSec;

  let from = prev?.from ?? 0;
  let to = prev?.to ?? 0;
  let t = prev?.t ?? 0;
  let x = prev?.x ?? 0;

  if (!prev || prev.to !== target || prev.vanish !== vanish) {
    from = prev?.x ?? 0;
    to = target;
    t = 0;
  }

  t = Math.min(1, t + step / Math.max(0.04, sec));
  x = from + (to - from) * easeOut(t);
  if (vanish && (t >= 1 || x < 0.4)) return null;
  if (t >= 1) x = to;
  return { x, from, to, t, vanish };
}

/** 固定盒 = 队尾直径。视觉大小用 scale，不要改 width/height。 */
export function badgeBoxPx(): number {
  return B.sizeNow;
}

export function badgeFontPx(order: number, now = false): string {
  if (now) return `${order > 9 ? B.fontNowWide : B.fontNow}px`;
  const k = B.sizeNow > 0 ? B.size / B.sizeNow : 1;
  const visual = B.sizeNow * (order > 9 ? B.fontWideScale : B.fontScale);
  return `${visual / Math.max(0.04, k)}px`;
}

/** 普通：右上外伸。队尾：棋子顶缘水平居中。 */
export function badgePlace(
  x: number,
  y: number,
  liftY: number,
  pieceW: number,
  box: number,
  bs: number,
  now: boolean,
): { tx: string; origin: string } {
  const k = box > 0 ? bs / box : 1;
  if (now) {
    const left = x + pieceW / 2 - box / 2;
    const top = y - liftY + B.nowY - box / 2;
    return { tx: `translate3d(${left}px,${top}px,0) scale(${k})`, origin: '50% 50%' };
  }
  return {
    tx: `translate3d(${x + pieceW - bs + B.out}px,${y - liftY - B.out}px,0) scale(${k})`,
    origin: '0 0',
  };
}

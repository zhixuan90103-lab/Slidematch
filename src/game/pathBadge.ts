/**
 * 路径角标运动。规格见 docs/FEEDBACK.md。
 * 出现、队尾放大/缩小：badgeSnapSec ease-out，到点即停。
 * 消失：与棋子取消相同，outSec ease-out。
 */

import { FEEL } from './design';

export type BadgeMotion = {
  x: number;
  from: number;
  to: number;
  t: number;
  vanish: boolean;
};

export function badgeTargetPx(keep: boolean, isNow: boolean): number {
  if (!keep) return 0;
  return isNow ? FEEL.select.badgeSizeNow : FEEL.select.badgeSize;
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
  const sec = vanish ? s.outSec : s.badgeSnapSec;

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
  return FEEL.select.badgeSizeNow;
}

export function badgeFontPx(order: number): string {
  return order > 9 ? '13px' : '16px';
}

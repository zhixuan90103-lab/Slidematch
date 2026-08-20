import { cellCenter, inBounds, type Cell } from './board';
import { COLS, ROWS } from './config';
import type { BoardLayout } from './settings';

/** 尾格核：小于此距离不加不减。 */
export const PATH_DEADZONE = 0.45;
/** 加格：沿该方向走过格心距的这一比例才加。 */
export const PATH_ADD_ALONG = 0.5;
/** 加格：手指可超出目标格心这么多倍格心距（快划连加）。 */
export const PATH_ADD_NEAR = 2.5;
/** 减格过中线滞回。 */
export const PATH_RETRACT_BIAS = 0.02;
/** 减格必须在上一格旁。 */
export const PATH_NEAR_STEP = 1.2;
/** 上一格方向的粘滞（度）。田字格斜划不先吃横竖。 */
export const PATH_STICK_DEG = 30;
/** 两次采样之间的插值步长（格宽倍数），补快划漏格。 */
export const PATH_TRACE_STEP = 0.4;
export const PATH_MIN = 3;

export type PathState = {
  cells: Cell[];
  color: number;
};

type Pt = { x: number; y: number };

const OCTANT: Cell[] = [
  { row: 0, col: 1 },
  { row: 1, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: -1 },
  { row: 0, col: -1 },
  { row: -1, col: -1 },
  { row: -1, col: 0 },
  { row: -1, col: 1 },
];

export function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

export function beginPath(start: Cell, colors: number[][]): PathState {
  return { cells: [{ row: start.row, col: start.col }], color: colors[start.row]![start.col]! };
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

function nearer(finger: Pt, target: Pt, other: Pt, biasPx: number): boolean {
  return dist2(finger.x, finger.y, target.x, target.y) + biasPx * biasPx < dist2(finger.x, finger.y, other.x, other.y);
}

function nearTarget(finger: Pt, target: Pt, from: Pt): boolean {
  const span = Math.hypot(target.x - from.x, target.y - from.y);
  if (span < 1e-6) return false;
  return Math.hypot(finger.x - target.x, finger.y - target.y) <= PATH_NEAR_STEP * span;
}

function wrapPi(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function octantStep(dx: number, dy: number): Cell {
  const angle = Math.atan2(dy, dx);
  const oct = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  return OCTANT[oct]!;
}

function aimDir(prev: Cell, tail: Cell, layout: BoardLayout): number {
  const sx = layout.cellW + layout.spacing;
  const sy = layout.cellH + layout.spacing;
  return Math.atan2((tail.row - prev.row) * sy, (tail.col - prev.col) * sx);
}

function pickDir(dx: number, dy: number, prev: Cell | null, tail: Cell, layout: BoardLayout): Cell {
  const raw = octantStep(dx, dy);
  if (!prev) return raw;
  const stick = (PATH_STICK_DEG * Math.PI) / 180;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(wrapPi(ang - aimDir(prev, tail, layout))) < stick) {
    return { row: tail.row - prev.row, col: tail.col - prev.col };
  }
  return raw;
}

function alongStep(finger: Pt, from: Pt, to: Pt): number {
  const vx = to.x - from.x;
  const vy = to.y - from.y;
  const len2 = vx * vx + vy * vy;
  if (len2 < 1e-6) return 0;
  return ((finger.x - from.x) * vx + (finger.y - from.y) * vy) / len2;
}

function pickAdd(
  tail: Cell,
  prev: Cell | null,
  finger: Pt,
  tailPt: Pt,
  layout: BoardLayout,
  occupied: Set<string>,
  colors: number[][],
  pathColor: number,
): Cell | null {
  const dir = pickDir(finger.x - tailPt.x, finger.y - tailPt.y, prev, tail, layout);
  const next: Cell = { row: tail.row + dir.row, col: tail.col + dir.col };
  if (prev && sameCell(next, prev)) return null;
  if (!inBounds(next) || occupied.has(cellKey(next))) return null;
  if (colors[next.row]![next.col] !== pathColor) return null;
  const nc = cellCenter(next, 0, 0, layout);
  if (alongStep(finger, tailPt, nc) < PATH_ADD_ALONG) return null;
  const span = Math.hypot(nc.x - tailPt.x, nc.y - tailPt.y);
  if (span < 1e-6) return null;
  if (Math.hypot(finger.x - nc.x, finger.y - nc.y) > PATH_ADD_NEAR * span) return null;
  return next;
}

function canRetract(finger: Pt, tailPt: Pt, prevPt: Pt, retractBias: number): boolean {
  return nearer(finger, prevPt, tailPt, retractBias) && nearTarget(finger, prevPt, tailPt);
}

/**
 * 方向（八向+粘滞）决定加哪一格；投影过半格心距才加。先加后减。
 */
export function stepPath(
  path: PathState,
  localX: number,
  localY: number,
  layout: BoardLayout,
  colors: number[][],
): PathState {
  const cells = path.cells.map((c) => ({ row: c.row, col: c.col }));
  const occupied = new Set(cells.map(cellKey));
  const unit = Math.min(layout.cellW, layout.cellH);
  const dead = PATH_DEADZONE * unit;
  const retractBias = PATH_RETRACT_BIAS * unit;
  const finger: Pt = { x: localX, y: localY };

  for (let n = 0; n < ROWS * COLS; n++) {
    const tail = cells[cells.length - 1];
    if (!tail) break;
    const tailPt = cellCenter(tail, 0, 0, layout);
    if (Math.hypot(finger.x - tailPt.x, finger.y - tailPt.y) < dead) break;

    const prev = cells.length >= 2 ? cells[cells.length - 2]! : null;
    const add = pickAdd(tail, prev, finger, tailPt, layout, occupied, colors, path.color);
    if (add) {
      occupied.add(cellKey(add));
      cells.push(add);
      continue;
    }
    if (prev) {
      const prevPt = cellCenter(prev, 0, 0, layout);
      if (canRetract(finger, tailPt, prevPt, retractBias)) {
        occupied.delete(cellKey(tail));
        cells.pop();
        continue;
      }
    }
    break;
  }

  return { cells, color: path.color };
}

export function canCommit(path: PathState): boolean {
  return path.cells.length >= PATH_MIN;
}

/** 不含起点、含终点。步长过小则只返回终点。 */
export function pointsAlong(
  from: { x: number; y: number },
  to: { x: number; y: number },
  stepPx: number,
): { x: number; y: number }[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return [{ x: to.x, y: to.y }];
  const step = Math.max(stepPx, 1);
  const n = Math.max(1, Math.ceil(dist / step));
  const out: { x: number; y: number }[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    out.push({ x: from.x + dx * t, y: from.y + dy * t });
  }
  return out;
}

export function lastStep(path: PathState): Cell | null {
  if (path.cells.length < 2) return null;
  const a = path.cells[path.cells.length - 2]!;
  const b = path.cells[path.cells.length - 1]!;
  return { row: b.row - a.row, col: b.col - a.col };
}

/**
 * 有来时方向且手指还在往前：先沿该方向走到投影点，再拐到手指。
 * 避免田字格直角快划被直线插值抄成对角线，把拐角格退掉。
 */
export function pointsAlongAimed(
  from: { x: number; y: number },
  to: { x: number; y: number },
  aim: Cell | null,
  layout: BoardLayout,
  stepPx: number,
): { x: number; y: number }[] {
  if (!aim || (aim.row === 0 && aim.col === 0)) return pointsAlong(from, to, stepPx);
  const sx = layout.cellW + layout.spacing;
  const sy = layout.cellH + layout.spacing;
  const ax = aim.col * sx;
  const ay = aim.row * sy;
  const alen = Math.hypot(ax, ay);
  if (alen < 1e-6) return pointsAlong(from, to, stepPx);
  const ux = ax / alen;
  const uy = ay / alen;
  const along = (to.x - from.x) * ux + (to.y - from.y) * uy;
  if (along <= stepPx) return pointsAlong(from, to, stepPx);
  const mid = { x: from.x + ux * along, y: from.y + uy * along };
  if (Math.hypot(to.x - mid.x, to.y - mid.y) <= stepPx) return pointsAlong(from, to, stepPx);
  return [...pointsAlong(from, mid, stepPx), ...pointsAlong(mid, to, stepPx)];
}

export function stepPathAlong(
  path: PathState,
  points: { x: number; y: number }[],
  layout: BoardLayout,
  colors: number[][],
): PathState {
  let next = path;
  for (const pt of points) {
    next = stepPath(next, pt.x, pt.y, layout, colors);
  }
  return next;
}

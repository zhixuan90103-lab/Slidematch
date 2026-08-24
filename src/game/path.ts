import { cellCenter, inBounds, isOrthoAdjacent, NEIGHBOR4, type Cell } from './board';
import { COLS, PATH_MIN, ROWS, isItemColor, isMagicColor } from './config';
import type { BoardLayout } from './settings';

/** 尾格核：小于此距离不加不减。 */
export const PATH_DEADZONE = 0.45;
/** 加格：越过共享边 / 进入邻格（沿该步投影 ≥ 此值）。 */
export const PATH_ADD_ALONG = 0.5;
/** 加格：手指可超出目标格心这么多倍格心距（快划连加上限）。 */
export const PATH_ADD_NEAR = 2.5;
/** 减格过中线滞回。 */
export const PATH_RETRACT_BIAS = 0.02;
/** 减格必须在上一格旁。 */
export const PATH_NEAR_STEP = 1.2;
/**
 * 轴滞回。已有来时轴时，另一轴分量须大于来时轴 × 此值才改轴。
 * 1.2 ≈ 50°，45° 斜划保持当前轴，楼梯按过边顺序走。
 */
export const PATH_AXIS_STICK = 1.2;
/** 两次采样之间的插值步长（格宽倍数），补快划漏格。 */
export const PATH_TRACE_STEP = 0.4;
export { PATH_MIN };

export type PathState = {
  cells: Cell[];
  /** 锁定色；-1 = 尚未锁定（从变色子起划）。 */
  color: number;
  /** 刚连上变色子：下一格可换成另一色。 */
  flex: boolean;
  /** 已连上魔法子：本划内任意非空格可续连。 */
  magic: boolean;
};

type Pt = { x: number; y: number };

export function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

export function canLinkColor(path: PathState, cellColor: number): boolean {
  if (cellColor < 0) return false;
  if (path.magic) return true;
  if (path.cells.length === 0) return true;
  if (isItemColor(cellColor)) return true;
  if (path.color < 0 || path.flex) return true;
  return cellColor === path.color;
}

export function applyLinkColor(path: PathState, cellColor: number): void {
  if (isMagicColor(cellColor)) {
    path.magic = true;
    path.flex = true;
    return;
  }
  if (isItemColor(cellColor)) {
    path.flex = true;
    return;
  }
  if (path.color < 0 || path.flex) {
    path.color = cellColor;
    path.flex = false;
  }
}

export function beginPath(start: Cell, colors: number[][]): PathState {
  const cellColor = colors[start.row]![start.col]!;
  const path: PathState = { cells: [{ row: start.row, col: start.col }], color: -1, flex: false, magic: false };
  applyLinkColor(path, cellColor);
  return path;
}

/** 下落把路径中间掏空时，从第一处非法格截断。 */
export function trimPath(path: PathState, colors: number[][]): PathState {
  const next: PathState = { cells: [], color: -1, flex: false, magic: false };
  for (const cell of path.cells) {
    const cellColor = colors[cell.row]![cell.col]!;
    if (!canLinkColor(next, cellColor)) break;
    next.cells.push({ row: cell.row, col: cell.col });
    applyLinkColor(next, cellColor);
  }
  return next;
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

function cellRect(
  cell: Cell,
  layout: BoardLayout,
): { left: number; top: number; right: number; bottom: number } {
  const sx = layout.cellW + layout.spacing;
  const sy = layout.cellH + layout.spacing;
  const left = cell.col * sx;
  const top = cell.row * sy;
  return { left, top, right: left + layout.cellW, bottom: top + layout.cellH };
}

/** 共享边算进邻格（已过边）。 */
function pointInCell(p: Pt, cell: Cell, layout: BoardLayout): boolean {
  const r = cellRect(cell, layout);
  return p.x >= r.left - 1e-6 && p.x <= r.right + 1e-6 && p.y >= r.top - 1e-6 && p.y <= r.bottom + 1e-6;
}

function alongStep(finger: Pt, from: Pt, to: Pt): number {
  const vx = to.x - from.x;
  const vy = to.y - from.y;
  const len2 = vx * vx + vy * vy;
  if (len2 < 1e-6) return 0;
  return ((finger.x - from.x) * vx + (finger.y - from.y) * vy) / len2;
}

function axisOf(d: Cell): 'h' | 'v' | null {
  if (d.row === 0 && d.col !== 0) return 'h';
  if (d.col === 0 && d.row !== 0) return 'v';
  return null;
}

/** 过角同时碰到两邻时：沿用当前轴，直到另一轴明显更大。 */
function preferCardinal(candidates: Cell[], prev: Cell | null, tail: Cell, dx: number, dy: number): Cell {
  if (candidates.length === 1) return candidates[0]!;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (prev) {
    const incoming = { row: tail.row - prev.row, col: tail.col - prev.col };
    const stay = axisOf(incoming);
    if (stay) {
      const along = stay === 'h' ? ax : ay;
      const other = stay === 'h' ? ay : ax;
      if (other <= along * PATH_AXIS_STICK) {
        const kept = candidates.find((c) => axisOf({ row: c.row - tail.row, col: c.col - tail.col }) === stay);
        if (kept) return kept;
      }
    }
  }
  const want: 'h' | 'v' = ax >= ay ? 'h' : 'v';
  return candidates.find((c) => axisOf({ row: c.row - tail.row, col: c.col - tail.col }) === want) ?? candidates[0]!;
}

function legalNext(
  next: Cell,
  prev: Cell | null,
  occupied: Set<string>,
  colors: number[][],
  path: PathState,
): boolean {
  if (prev && sameCell(next, prev)) return false;
  if (!inBounds(next) || occupied.has(cellKey(next))) return false;
  return canLinkColor(path, colors[next.row]![next.col]!);
}

function pickAdd(
  tail: Cell,
  prev: Cell | null,
  finger: Pt,
  tailPt: Pt,
  layout: BoardLayout,
  occupied: Set<string>,
  colors: number[][],
  path: PathState,
): Cell | null {
  const inside: Cell[] = [];
  const pastEdge: Cell[] = [];
  for (const d of NEIGHBOR4) {
    const next: Cell = { row: tail.row + d.row, col: tail.col + d.col };
    if (!legalNext(next, prev, occupied, colors, path)) continue;
    if (pointInCell(finger, next, layout)) {
      inside.push(next);
      continue;
    }
    const nc = cellCenter(next, 0, 0, layout);
    if (alongStep(finger, tailPt, nc) < PATH_ADD_ALONG) continue;
    const span = Math.hypot(nc.x - tailPt.x, nc.y - tailPt.y);
    if (span < 1e-6) continue;
    if (Math.hypot(finger.x - nc.x, finger.y - nc.y) > PATH_ADD_NEAR * span) continue;
    pastEdge.push(next);
  }
  const pool = inside.length ? inside : pastEdge;
  if (!pool.length) return null;
  return preferCardinal(pool, prev, tail, finger.x - tailPt.x, finger.y - tailPt.y);
}

function canRetract(finger: Pt, tailPt: Pt, prevPt: Pt, retractBias: number): boolean {
  return nearer(finger, prevPt, tailPt, retractBias) && nearTarget(finger, prevPt, tailPt);
}

/**
 * 进格 / 过共享边加四邻；先加后减。对角非法。
 */
export function stepPath(
  path: PathState,
  localX: number,
  localY: number,
  layout: BoardLayout,
  colors: number[][],
): PathState {
  const nextPath: PathState = {
    cells: path.cells.map((c) => ({ row: c.row, col: c.col })),
    color: path.color,
    flex: path.flex,
    magic: path.magic,
  };
  const occupied = new Set(nextPath.cells.map(cellKey));
  const unit = Math.min(layout.cellW, layout.cellH);
  const dead = PATH_DEADZONE * unit;
  const retractBias = PATH_RETRACT_BIAS * unit;
  const finger: Pt = { x: localX, y: localY };

  for (let n = 0; n < ROWS * COLS; n++) {
    const tail = nextPath.cells[nextPath.cells.length - 1];
    if (!tail) break;
    const tailPt = cellCenter(tail, 0, 0, layout);
    if (Math.hypot(finger.x - tailPt.x, finger.y - tailPt.y) < dead) break;

    const prev = nextPath.cells.length >= 2 ? nextPath.cells[nextPath.cells.length - 2]! : null;
    const add = pickAdd(tail, prev, finger, tailPt, layout, occupied, colors, nextPath);
    if (add) {
      occupied.add(cellKey(add));
      nextPath.cells.push(add);
      applyLinkColor(nextPath, colors[add.row]![add.col]!);
      break;
    }
    if (prev) {
      const prevPt = cellCenter(prev, 0, 0, layout);
      if (canRetract(finger, tailPt, prevPt, retractBias)) {
        occupied.delete(cellKey(tail));
        nextPath.cells.pop();
        const rebuilt = trimPath({ ...nextPath, cells: nextPath.cells }, colors);
        nextPath.color = rebuilt.color;
        nextPath.flex = rebuilt.flex;
        nextPath.magic = rebuilt.magic;
        continue;
      }
    }
    break;
  }

  return nextPath;
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
  const n = Math.min(64, Math.max(1, Math.ceil(dist / step)));
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

function viaElbow(
  from: { x: number; y: number },
  to: { x: number; y: number },
  mid: { x: number; y: number },
  stepPx: number,
): { x: number; y: number }[] {
  if (Math.hypot(to.x - mid.x, to.y - mid.y) <= stepPx) return pointsAlong(from, to, stepPx);
  return [...pointsAlong(from, mid, stepPx), ...pointsAlong(mid, to, stepPx)];
}

/**
 * 两轴都跳过 stepPx：走折线（4-connected walk），禁止对角线弦把拐角格吃掉。
 * 有 aim：先沿该四向；无 aim：|Δx|≥|Δy| 先横后竖。
 */
export function pointsAlongAimed(
  from: { x: number; y: number },
  to: { x: number; y: number },
  aim: Cell | null,
  layout: BoardLayout,
  stepPx: number,
): { x: number; y: number }[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const twoAxis = Math.abs(dx) > stepPx && Math.abs(dy) > stepPx;

  if (aim && (aim.row !== 0 || aim.col !== 0)) {
    const sx = layout.cellW + layout.spacing;
    const sy = layout.cellH + layout.spacing;
    const ax = aim.col * sx;
    const ay = aim.row * sy;
    const alen = Math.hypot(ax, ay);
    if (alen >= 1e-6) {
      const ux = ax / alen;
      const uy = ay / alen;
      const along = dx * ux + dy * uy;
      if (along > stepPx) {
        const mid = { x: from.x + ux * along, y: from.y + uy * along };
        return viaElbow(from, to, mid, stepPx);
      }
    }
  }

  if (twoAxis) {
    const mid =
      Math.abs(dx) >= Math.abs(dy)
        ? { x: to.x, y: from.y }
        : { x: from.x, y: to.y };
    return viaElbow(from, to, mid, stepPx);
  }

  return pointsAlong(from, to, stepPx);
}

function sharedEdgeHit(
  from: Pt,
  to: Pt,
  tail: Cell,
  next: Cell,
  layout: BoardLayout,
): number | null {
  if (!isOrthoAdjacent(tail, next)) return null;
  const tr = cellRect(tail, layout);
  const nr = cellRect(next, layout);
  const vertical = next.row === tail.row;
  if (vertical) {
    const x = next.col > tail.col ? tr.right : tr.left;
    const y0 = Math.max(tr.top, nr.top);
    const y1 = Math.min(tr.bottom, nr.bottom);
    const dx = to.x - from.x;
    if (Math.abs(dx) < 1e-12) return null;
    const t = (x - from.x) / dx;
    if (t < -1e-6 || t > 1 + 1e-6) return null;
    const y = from.y + t * (to.y - from.y);
    if (y < y0 - 1e-6 || y > y1 + 1e-6) return null;
    return Math.max(0, Math.min(1, t));
  }
  const y = next.row > tail.row ? tr.bottom : tr.top;
  const x0 = Math.max(tr.left, nr.left);
  const x1 = Math.min(tr.right, nr.right);
  const dy = to.y - from.y;
  if (Math.abs(dy) < 1e-12) return null;
  const t = (y - from.y) / dy;
  if (t < -1e-6 || t > 1 + 1e-6) return null;
  const x = from.x + t * (to.x - from.x);
  if (x < x0 - 1e-6 || x > x1 + 1e-6) return null;
  return Math.max(0, Math.min(1, t));
}

function appendNeighbor(
  path: PathState,
  next: Cell,
  colors: number[][],
): PathState | null {
  const tail = path.cells[path.cells.length - 1];
  if (!tail) return null;
  const prev = path.cells.length >= 2 ? path.cells[path.cells.length - 2]! : null;
  if (prev && sameCell(next, prev)) return null;
  if (!inBounds(next)) return null;
  if (!isOrthoAdjacent(tail, next)) return null;
  if (path.cells.some((c) => sameCell(c, next))) return null;
  const cellColor = colors[next.row]![next.col]!;
  if (!canLinkColor(path, cellColor)) return null;
  const cells = path.cells.map((c) => ({ row: c.row, col: c.col }));
  cells.push({ row: next.row, col: next.col });
  const out: PathState = { cells, color: path.color, flex: path.flex, magic: path.magic };
  applyLinkColor(out, cellColor);
  return out;
}

function crossingHits(
  path: PathState,
  from: Pt,
  to: Pt,
  layout: BoardLayout,
  colors: number[][],
): { t: number; cell: Cell }[] {
  const tail = path.cells[path.cells.length - 1];
  if (!tail) return [];
  const prev = path.cells.length >= 2 ? path.cells[path.cells.length - 2]! : null;
  const occupied = new Set(path.cells.map(cellKey));
  const hits: { t: number; cell: Cell }[] = [];
  for (const d of NEIGHBOR4) {
    const next: Cell = { row: tail.row + d.row, col: tail.col + d.col };
    if (!legalNext(next, prev, occupied, colors, path)) continue;
    const t = sharedEdgeHit(from, to, tail, next, layout);
    if (t === null) continue;
    hits.push({ t, cell: next });
  }
  hits.sort((a, b) => a.t - b.t || a.cell.row - b.cell.row || a.cell.col - b.cell.col);
  if (hits.length >= 2 && Math.abs(hits[0]!.t - hits[1]!.t) < 1e-4) {
    const picked = preferCardinal(
      [hits[0]!.cell, hits[1]!.cell],
      prev,
      tail,
      to.x - from.x,
      to.y - from.y,
    );
    const rest = hits.filter((h) => !sameCell(h.cell, picked));
    const first = hits.find((h) => sameCell(h.cell, picked))!;
    return [first, ...rest];
  }
  return hits;
}

/**
 * 一段线按过共享边的顺序加四邻，禁止对角。短段不扫边，只跑 stepPath。
 */
export function stepPathCrossing(
  path: PathState,
  from: Pt,
  to: Pt,
  layout: BoardLayout,
  colors: number[][],
): PathState {
  const unit = Math.min(layout.cellW, layout.cellH);
  if (Math.hypot(to.x - from.x, to.y - from.y) < PATH_DEADZONE * unit) {
    return stepPath(path, to.x, to.y, layout, colors);
  }

  let next = path;
  let tFloor = -1;
  for (let k = 0; k < ROWS * COLS; k++) {
    const hits = crossingHits(next, from, to, layout, colors);
    let grew = false;
    for (const h of hits) {
      if (h.t <= tFloor + 1e-4) continue;
      const added = appendNeighbor(next, h.cell, colors);
      if (!added) continue;
      next = added;
      tFloor = h.t;
      grew = true;
      break;
    }
    if (!grew) break;
  }
  return stepPath(next, to.x, to.y, layout, colors);
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

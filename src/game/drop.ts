import { inBounds, type Cell } from './board';
import { COLOR_COUNT, COLS, FEEL, LOOK, ROWS, isMagicColor, synthGatherTimes, synthPopAmp } from './config';

/** 设计默认；运行时用设置里的 dropV0 / dropAccel / dropVMax。 */
export const DROP_V0 = LOOK.dropV0;
export const DROP_V_SPAWN = LOOK.dropV0;
export const DROP_G = LOOK.dropAccel;
export const DROP_V_MAX = LOOK.dropVMax;
export const DROP_RELEASE = 0.22;
export const DROP_SOFT_GAP = 0.85;
export const DROP_SNAP_PX = 3;
export const DROP_MOMENTUM = 0.05;
/** 下落中形变。 */
export const DROP_STRETCH_MAX = 0.08;
export const DROP_SQUASH_MAX = 0.04;
export const LAND_SPEED_TH = 250;
export const LAND_MIN_SQUASH = 0.01;
export const LAND_MAX_SQUASH = 0.12;
export const LAND_MOVE_MIN = 1.51;
export const LAND_MOVE_MAX = 5.03;
export const LAND_OVERSHOOT_MIN = 0;
export const LAND_OVERSHOOT_MAX = 1;
export const LAND_SQUASH_SEC = 0.055;
export const LAND_BOUNCE_SEC = 0.085;
export const LAND_SETTLE_SEC = 0.055;
export const CLEAR_SEC = FEEL.clear.sec;

export type PieceState = 'stable' | 'dropping' | 'clearing' | 'spawning';

export type Piece = {
  id: number;
  color: number;
  state: PieceState;
  col: number;
  visualY: number;
  sourceRow: number;
  destRow: number | null;
  clearT: number;
  vy: number;
  dropStartY: number;
  landSpeed: number;
  landingTime: number;
  landT: number;
  landActive: boolean;
  landSquash: number;
  landMove: number;
  landOvershoot: number;
  landOvershootScale: number;
  scaleX: number;
  scaleY: number;
  offsetY: number;
  /** 飞向队尾：目标列；null = 原地基础消。 */
  gatherCol: number | null;
  gatherY: number;
  flySec: number;
  /** 道具弹出：>0 时不可划。 */
  itemPopSec: number;
  itemPopT: number;
  itemPopAmp: number;
};

export type Slot = {
  current: Piece | null;
  incoming: Piece | null;
};

export type DropSim = {
  slots: Slot[][];
  pieces: Map<number, Piece>;
  time: number;
  dropV0: number;
  dropAccel: number;
  dropVMax: number;
  /** 消除动画结束后在该格放入道具。 */
  pendingItem: { cell: Cell; color: number; magic: boolean; pathLen: number } | null;
  /** 路径飞入格一起腾格的时刻。 */
  vacateAt: number | null;
};

export type DropMetrics = {
  stride: number;
  pieceH: number;
  dropV0?: number;
  dropAccel?: number;
  dropVMax?: number;
  onPieceCleared?: (piece: Piece) => void;
};

function dropG(sim: DropSim): number {
  return sim.dropAccel;
}
function dropV0(sim: DropSim): number {
  return sim.dropV0;
}
function dropVSpawn(sim: DropSim): number {
  return sim.dropV0;
}
function dropVMax(sim: DropSim): number {
  return Math.max(sim.dropV0, sim.dropVMax);
}

let nextId = 1;
const piecePool: Piece[] = [];
const droppingBuf: Piece[] = [];
const belowBuf: Piece[] = [];
const recycleBuf: Piece[] = [];

function makeSlot(): Slot {
  return { current: null, incoming: null };
}

function fillPiece(p: Piece, color: number, col: number, row: number): Piece {
  p.color = color;
  p.col = col;
  p.visualY = row;
  p.sourceRow = row;
  p.destRow = null;
  p.state = 'stable';
  p.clearT = 0;
  p.vy = 0;
  p.dropStartY = row;
  p.landSpeed = 0;
  p.landingTime = -1;
  p.landT = 0;
  p.landActive = false;
  p.landSquash = 0;
  p.landMove = 0;
  p.landOvershoot = 0;
  p.landOvershootScale = 0;
  p.scaleX = 1;
  p.scaleY = 1;
  p.offsetY = 0;
  p.gatherCol = null;
  p.gatherY = 0;
  p.flySec = 0;
  p.itemPopSec = 0;
  p.itemPopT = 0;
  p.itemPopAmp = 1;
  return p;
}

function makePiece(color: number, col: number, row: number): Piece {
  return fillPiece(
    {
      id: nextId++,
      color,
      state: 'stable',
      col,
      visualY: row,
      sourceRow: row,
      destRow: null,
      clearT: 0,
      vy: 0,
      dropStartY: row,
      landSpeed: 0,
      landingTime: -1,
      landT: 0,
      landActive: false,
      landSquash: 0,
      landMove: 0,
      landOvershoot: 0,
      landOvershootScale: 0,
      scaleX: 1,
      scaleY: 1,
      offsetY: 0,
      gatherCol: null,
      gatherY: 0,
      flySec: 0,
      itemPopSec: 0,
      itemPopT: 0,
      itemPopAmp: 1,
    },
    color,
    col,
    row,
  );
}

function acquirePiece(color: number, col: number, row: number): Piece {
  const pooled = piecePool.pop();
  if (pooled) return fillPiece(pooled, color, col, row);
  return makePiece(color, col, row);
}

function recyclePiece(sim: DropSim, piece: Piece): void {
  sim.pieces.delete(piece.id);
  piecePool.push(piece);
}

export function createDropSim(colors: number[][]): DropSim {
  const slots = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, makeSlot));
  const pieces = new Map<number, Piece>();
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const piece = makePiece(colors[row]![col]!, col, row);
      pieces.set(piece.id, piece);
      slots[row]![col]!.current = piece;
    }
  }
  return {
    slots,
    pieces,
    time: 0,
    dropV0: DROP_V0,
    dropAccel: DROP_G,
    dropVMax: DROP_V_MAX,
    pendingItem: null,
    vacateAt: null,
  };
}

export function canReceiveDrop(sim: DropSim, row: number, col: number): boolean {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  if (sim.pendingItem && sim.pendingItem.cell.row === row && sim.pendingItem.cell.col === col) {
    return false;
  }
  const s = sim.slots[row]![col]!;
  if (s.incoming) return false;
  if (!s.current) return true;
  return false;
}

export function stableColors(sim: DropSim): number[][] {
  return sim.slots.map((row) =>
    row.map((s) => {
      const p = s.current;
      return p && p.state === 'stable' ? p.color : -1;
    }),
  );
}

/** 仅静止子可划；下落 / 消除 / 生成中的子不算。 */
export function isCellStable(sim: DropSim, row: number, col: number, color?: number): boolean {
  const p = sim.slots[row]?.[col]?.current;
  if (!p || p.state !== 'stable') return false;
  if (p.itemPopSec > 0 && p.itemPopT < p.itemPopSec) return false;
  if (color !== undefined && p.color !== color) return false;
  return true;
}

export function stablePathCount(sim: DropSim, cells: { row: number; col: number }[]): number {
  let n = 0;
  for (const c of cells) {
    if (isCellStable(sim, c.row, c.col)) n += 1;
  }
  return n;
}

export function boardBusy(sim: DropSim): boolean {
  if (sim.pendingItem) return true;
  for (const p of sim.pieces.values()) {
    if (p.state !== 'stable') return true;
    if (p.itemPopSec > 0 && p.itemPopT < p.itemPopSec) return true;
  }
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (sim.slots[row]![col]!.incoming) return true;
    }
  }
  return false;
}

export function needsTick(sim: DropSim): boolean {
  if (boardBusy(sim) || sim.pieces.size < ROWS * COLS) return true;
  for (const p of sim.pieces.values()) {
    if (p.landActive) return true;
  }
  return false;
}

function markClearing(
  sim: DropSim,
  cell: Cell,
  delay = 0,
  gather?: { col: number; y: number; flySec: number },
): void {
  if (!inBounds(cell)) return;
  const p = sim.slots[cell.row]![cell.col]!.current;
  if (!p || p.state !== 'stable') return;
  p.state = 'clearing';
  p.clearT = -delay;
  p.landActive = false;
  p.vy = 0;
  if (gather) {
    p.gatherCol = gather.col;
    p.gatherY = gather.y;
    p.flySec = gather.flySec;
  }
}

function placeItem(sim: DropSim, cell: Cell, color: number, magic: boolean, pathLen: number): boolean {
  if (!inBounds(cell)) return false;
  const s = sim.slots[cell.row]![cell.col]!;
  if (s.incoming || s.current) return false;
  const piece = acquirePiece(color, cell.col, cell.row);
  piece.state = 'stable';
  const mul = magic ? FEEL.synth.magicMul : 1;
  piece.itemPopSec = FEEL.synth.spawnSec * mul;
  piece.itemPopT = 0;
  piece.itemPopAmp = synthPopAmp(pathLen);
  sim.pieces.set(piece.id, piece);
  s.current = piece;
  return true;
}

export type ClearOpts = {
  extraCells?: Cell[];
  spawnColor?: number | null;
};

export function beginClear(sim: DropSim, cells: Cell[], opts: ClearOpts = {}): void {
  const seen = new Set<string>();
  const spawn = opts.spawnColor != null && cells.length > 0;
  const last = spawn ? cells[cells.length - 1]! : null;
  const magic = spawn && isMagicColor(opts.spawnColor!);
  const { flySec, stagger } = spawn
    ? synthGatherTimes(cells.length, !!magic)
    : { flySec: FEEL.synth.flySec, stagger: FEEL.synth.stagger };
  const gather = last
    ? { col: last.col, y: last.row, flySec }
    : undefined;

  const add = (cell: Cell, delay: number, useGather: boolean) => {
    const k = `${cell.row},${cell.col}`;
    if (seen.has(k)) return;
    seen.add(k);
    markClearing(sim, cell, delay, useGather ? gather : undefined);
  };
  cells.forEach((cell, i) => add(cell, spawn ? i * stagger : 0, spawn));
  if (opts.extraCells) {
    const extraStagger = FEEL.clear.extraStagger;
    opts.extraCells.forEach((cell, i) => {
      add(cell, i * extraStagger, false);
    });
  }
  if (spawn && last) {
    sim.pendingItem = {
      cell: { row: last.row, col: last.col },
      color: opts.spawnColor!,
      magic: !!magic,
      pathLen: cells.length,
    };
    const lastDelay = Math.max(0, cells.length - 1) * stagger;
    sim.vacateAt = sim.time + lastDelay + FEEL.synth.vacateSec;
  } else {
    sim.vacateAt = null;
  }
}

function speedAmp(speed: number, min: number, max: number): number {
  if (speed < LAND_SPEED_TH) return min * (speed / LAND_SPEED_TH);
  const ratio = Math.min(1, (speed - LAND_SPEED_TH) / (DROP_V_MAX - LAND_SPEED_TH));
  return min + (max - min) * ratio;
}

function cancelLanding(piece: Piece): void {
  piece.landActive = false;
  piece.landT = 0;
  piece.offsetY = 0;
  piece.scaleX = 1;
  piece.scaleY = 1;
}

function beginDrop(sim: DropSim, piece: Piece, fromRow: number): boolean {
  const dest = fromRow + 1;
  if (dest >= ROWS || !canReceiveDrop(sim, dest, piece.col)) return false;
  sim.slots[dest]![piece.col]!.incoming = piece;
  piece.destRow = dest;
  piece.dropStartY = piece.visualY;
  if (piece.state === 'dropping' || piece.state === 'spawning') {
    piece.sourceRow = fromRow;
    return true;
  }
  cancelLanding(piece);
  const inherit =
    sim.time - piece.landingTime < DROP_MOMENTUM && piece.landSpeed > dropV0(sim);
  piece.vy = inherit ? piece.landSpeed : fromRow < 0 ? dropVSpawn(sim) : dropV0(sim);
  piece.state = fromRow < 0 ? 'spawning' : 'dropping';
  piece.sourceRow = fromRow;
  return true;
}

function isItemPopping(piece: Piece): boolean {
  return piece.itemPopSec > 0 && piece.itemPopT < piece.itemPopSec;
}

function trySpawn(sim: DropSim): void {
  for (let col = 0; col < COLS; col++) {
    if (!canReceiveDrop(sim, 0, col)) continue;
    const piece = acquirePiece(Math.floor(Math.random() * COLOR_COUNT), col, -1);
    piece.state = 'spawning';
    piece.vy = dropVSpawn(sim);
    sim.pieces.set(piece.id, piece);
    beginDrop(sim, piece, -1);
  }
}

function scanStarts(sim: DropSim): void {
  for (let col = 0; col < COLS; col++) {
    for (let row = ROWS - 2; row >= 0; row--) {
      const p = sim.slots[row]![col]!.current;
      if (!p) continue;
      if (p.state !== 'stable') continue;
      if (isItemPopping(p)) continue;
      beginDrop(sim, p, row);
    }
  }
  trySpawn(sim);
}

function applyDropDeform(piece: Piece): void {
  const ratio = Math.min(1, piece.vy / DROP_V_MAX); // deform vs base cap; speed scale applied in integrate
  piece.scaleX = 1 - DROP_SQUASH_MAX * ratio;
  piece.scaleY = 1 + DROP_STRETCH_MAX * ratio;
  piece.offsetY = 0;
}

function startLandingAnim(piece: Piece, pieceH: number): void {
  piece.landSquash = speedAmp(piece.landSpeed, LAND_MIN_SQUASH, LAND_MAX_SQUASH);
  piece.landMove = speedAmp(piece.landSpeed, LAND_MOVE_MIN, LAND_MOVE_MAX);
  piece.landOvershoot = speedAmp(piece.landSpeed, LAND_OVERSHOOT_MIN, LAND_OVERSHOOT_MAX);
  piece.landOvershootScale = pieceH > 1e-6 ? piece.landOvershoot / (pieceH * 0.5) : 0;
  piece.landT = 0;
  piece.landActive = piece.landSquash > 0.001 || piece.landMove > 0.01;
  piece.scaleX = 1;
  piece.scaleY = 1;
  piece.offsetY = 0;
}

function easeIn(t: number): number {
  return t * t;
}
function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function tickLanding(piece: Piece, dt: number): void {
  if (!piece.landActive) return;
  piece.landT += dt;
  const a = LAND_SQUASH_SEC;
  const b = a + LAND_BOUNCE_SEC;
  const c = b + LAND_SETTLE_SEC;
  const sq = piece.landSquash;
  const mv = piece.landMove;
  const ov = piece.landOvershoot;
  const os = piece.landOvershootScale;
  if (piece.landT <= a) {
    const t = easeIn(piece.landT / a);
    piece.scaleX = 1 + sq * t;
    piece.scaleY = 1 - sq * t;
    piece.offsetY = mv * t;
  } else if (piece.landT <= b) {
    const t = easeOut((piece.landT - a) / LAND_BOUNCE_SEC);
    piece.scaleX = 1 + sq + t * (-os * 0.5 - sq);
    piece.scaleY = 1 - sq + t * (os + sq);
    piece.offsetY = mv + t * (-ov - mv);
  } else if (piece.landT <= c) {
    const t = easeInOut((piece.landT - b) / LAND_SETTLE_SEC);
    piece.scaleX = 1 - os * 0.5 + t * (os * 0.5);
    piece.scaleY = 1 + os + t * -os;
    piece.offsetY = -ov + t * ov;
  } else {
    cancelLanding(piece);
  }
}

function maybeTransfer(sim: DropSim, piece: Piece, stride: number): void {
  if (piece.destRow === null) return;
  if (piece.sourceRow === piece.destRow) return;
  const traveled = (piece.visualY - piece.dropStartY) * stride;
  if (traveled < stride * DROP_RELEASE) return;
  if (piece.sourceRow >= 0) {
    const src = sim.slots[piece.sourceRow]![piece.col]!;
    if (src.current === piece) src.current = null;
  }
  const dest = sim.slots[piece.destRow]![piece.col]!;
  if (dest.incoming === piece) dest.incoming = null;
  dest.current = piece;
  piece.sourceRow = piece.destRow;
}

function finishHop(sim: DropSim, piece: Piece, metrics: DropMetrics): void {
  const dest = piece.destRow;
  if (dest === null) return;
  if (piece.sourceRow >= 0 && piece.sourceRow !== dest) {
    const src = sim.slots[piece.sourceRow]![piece.col]!;
    if (src.current === piece) src.current = null;
  }
  const slot = sim.slots[dest]![piece.col]!;
  slot.current = piece;
  if (slot.incoming === piece) slot.incoming = null;
  piece.visualY = dest;
  piece.sourceRow = dest;
  piece.destRow = null;
  if (beginDrop(sim, piece, dest)) {
    applyDropDeform(piece);
    return;
  }
  piece.landSpeed = piece.vy;
  piece.landingTime = sim.time;
  piece.vy = 0;
  piece.state = 'stable';
  startLandingAnim(piece, metrics.pieceH);
}

function piecesBelow(sim: DropSim, piece: Piece): Piece[] {
  belowBuf.length = 0;
  for (const other of sim.pieces.values()) {
    if (other === piece || other.col !== piece.col) continue;
    if (other.visualY <= piece.visualY + 1e-6) continue;
    belowBuf.push(other);
  }
  belowBuf.sort((a, b) => a.visualY - b.visualY);
  return belowBuf;
}

function integrate(sim: DropSim, dt: number, metrics: DropMetrics): void {
  const { stride } = metrics;
  const snapRows = stride > 1e-6 ? DROP_SNAP_PX / stride : 0.05;
  const softPx = stride * DROP_SOFT_GAP;

  droppingBuf.length = 0;
  for (const piece of sim.pieces.values()) {
    if (piece.state === 'dropping' || piece.state === 'spawning') droppingBuf.push(piece);
  }
  droppingBuf.sort((a, b) => b.visualY - a.visualY);

  for (const piece of droppingBuf) {
    if (piece.destRow === null) continue;
    piece.vy = Math.min(dropVMax(sim), piece.vy + dropG(sim) * dt);
    const oldY = piece.visualY;

    const below = piecesBelow(sim, piece);
    const blocker = below[0];
    if (blocker) {
      const gap = (blocker.visualY - piece.visualY) * stride;
      if (gap < softPx && piece.vy > blocker.vy) {
        const alpha = Math.max(0, (softPx - gap) / (softPx * 0.2));
        piece.vy = piece.vy * (1 - alpha) + blocker.vy * alpha;
      }
    }

    piece.visualY = oldY + (piece.vy * dt) / stride;
    maybeTransfer(sim, piece, stride);
    applyDropDeform(piece);

    if (piece.visualY >= piece.destRow - snapRows) {
      finishHop(sim, piece, metrics);
    }
  }

  recycleBuf.length = 0;
  for (const piece of sim.pieces.values()) {
    if (piece.state === 'clearing') {
      piece.clearT += dt;
      let dur = piece.flySec > 0 ? piece.flySec : CLEAR_SEC;
      const pending = sim.pendingItem;
      if (
        pending &&
        piece.flySec > 0 &&
        piece.col === pending.cell.col &&
        Math.round(piece.visualY) === pending.cell.row
      ) {
        dur = Math.max(0.04, piece.flySec - FEEL.synth.spawnLead);
      }
      if (
        piece.flySec > 0 &&
        sim.vacateAt != null &&
        sim.time >= sim.vacateAt
      ) {
        const srcRow = piece.sourceRow;
        if (srcRow >= 0 && srcRow < ROWS) {
          const slot = sim.slots[srcRow]![piece.col]!;
          if (slot.current === piece) slot.current = null;
        }
      }
      if (piece.clearT >= dur) {
        if (piece.flySec <= 0) metrics.onPieceCleared?.(piece);
        const row = Math.round(piece.visualY);
        if (row >= 0 && row < ROWS) {
          const slot = sim.slots[row]![piece.col]!;
          if (slot.current === piece) slot.current = null;
        }
        recycleBuf.push(piece);
      }
      continue;
    }
    if (piece.state === 'stable') {
      if (piece.itemPopSec > 0 && piece.itemPopT < piece.itemPopSec) {
        piece.itemPopT += dt;
      }
      tickLanding(piece, dt);
    }
  }
  for (let i = 0; i < recycleBuf.length; i++) recyclePiece(sim, recycleBuf[i]!);
  if (sim.pendingItem) {
    const job = sim.pendingItem;
    if (placeItem(sim, job.cell, job.color, job.magic, job.pathLen)) sim.pendingItem = null;
  }
}

export function tickDrop(sim: DropSim, dt: number, metrics: DropMetrics): void {
  const step = Math.min(Math.max(dt, 0), 0.05);
  sim.dropV0 = metrics.dropV0 ?? DROP_V0;
  sim.dropAccel = metrics.dropAccel ?? DROP_G;
  sim.dropVMax = metrics.dropVMax ?? DROP_V_MAX;
  sim.time += step;
  scanStarts(sim);
  integrate(sim, step, metrics);
}

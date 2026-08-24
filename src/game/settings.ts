import { COLS, FRAME_SCALE, FRAME_SLICE, LOOK, PIECE_ASPECT, ROWS } from './config';

const KEY = 'slidematch.tune.v16';

export type Tune = {
  visualWidth: number;
  visualHeight: number;
  spacing: number;
  pieceSize: number;
  cellSize: number;
  cellOpacity: number;
  dropV0: number;
  dropAccel: number;
  dropVMax: number;
  maskInset: number;
  maskRadius: number;
};

/** 与 `LOOK` 同一套默认；设置里「恢复默认」回到设计值。 */
export const TUNE_DEFAULTS: Tune = { ...LOOK };

export type BoardLayout = {
  visualWidth: number;
  visualHeight: number;
  cellW: number;
  cellH: number;
  spacing: number;
  piece: number;
  pieceW: number;
  pieceH: number;
  frameWidth: number;
  gridWidth: number;
  gridHeight: number;
  gridLeft: number;
  gridTop: number;
  cellOpacity: number;
};

export function loadTune(): Tune {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...TUNE_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Tune>;
    return {
      visualWidth: clamp(parsed.visualWidth ?? TUNE_DEFAULTS.visualWidth, 240, 390),
      visualHeight: clamp(parsed.visualHeight ?? TUNE_DEFAULTS.visualHeight, 240, 560),
      spacing: clamp(parsed.spacing ?? TUNE_DEFAULTS.spacing, 0, 16),
      pieceSize: clamp(parsed.pieceSize ?? TUNE_DEFAULTS.pieceSize, 16, 128),
      cellSize: clamp(parsed.cellSize ?? TUNE_DEFAULTS.cellSize, 20, 128),
      cellOpacity: clamp(parsed.cellOpacity ?? TUNE_DEFAULTS.cellOpacity, 0, 100),
      dropV0: clamp(parsed.dropV0 ?? TUNE_DEFAULTS.dropV0, 80, 1400),
      dropAccel: clamp(parsed.dropAccel ?? TUNE_DEFAULTS.dropAccel, 200, 5000),
      dropVMax: clamp(parsed.dropVMax ?? TUNE_DEFAULTS.dropVMax, 150, 2500),
      maskInset: clamp(parsed.maskInset ?? TUNE_DEFAULTS.maskInset, 0, 48),
      maskRadius: clamp(parsed.maskRadius ?? TUNE_DEFAULTS.maskRadius, 0, 64),
    };
  } catch {
    return { ...TUNE_DEFAULTS };
  }
}

export function saveTune(tune: Tune): void {
  localStorage.setItem(KEY, JSON.stringify(tune));
}

/** 格子/棋子同一长宽比。两个「大小」都指宽度。 */
export function computeLayout(tune: Tune): BoardLayout {
  const cellW = tune.cellSize;
  const cellH = tune.cellSize * PIECE_ASPECT;
  const pieceW = tune.pieceSize;
  const pieceH = tune.pieceSize * PIECE_ASPECT;
  const gridWidth = COLS * cellW + (COLS - 1) * tune.spacing;
  const gridHeight = ROWS * cellH + (ROWS - 1) * tune.spacing;
  return {
    visualWidth: tune.visualWidth,
    visualHeight: tune.visualHeight,
    cellW,
    cellH,
    spacing: tune.spacing,
    piece: tune.pieceSize,
    pieceW,
    pieceH,
    frameWidth: Math.round(FRAME_SLICE * FRAME_SCALE),
    gridWidth,
    gridHeight,
    gridLeft: (tune.visualWidth - gridWidth) / 2,
    gridTop: (tune.visualHeight - gridHeight) / 2,
    cellOpacity: tune.cellOpacity / 100,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

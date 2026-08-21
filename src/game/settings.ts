import { COLS, FRAME_SCALE, FRAME_SLICE, PIECE_SRC_H, PIECE_SRC_W, ROWS } from './config';

const KEY = 'slidematch.tune.v14';

export type Tune = {
  visualWidth: number;
  visualHeight: number;
  spacing: number;
  pieceSize: number;
  cellSize: number;
  cellOpacity: number;
  dropSpeed: number;
  maskInset: number;
  maskRadius: number;
};

export const TUNE_DEFAULTS: Tune = {
  visualWidth: 380,
  visualHeight: 455,
  spacing: 0,
  pieceSize: 65,
  cellSize: 60,
  cellOpacity: 100,
  dropSpeed: 100,
  maskInset: 7,
  maskRadius: 5,
};

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
      dropSpeed: clamp(parsed.dropSpeed ?? TUNE_DEFAULTS.dropSpeed, 30, 200),
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

/** 格子跟棋子同一长宽比（360×430）。棋子大小独立，不再被格子卡住。 */
export function computeLayout(tune: Tune): BoardLayout {
  const aspect = PIECE_SRC_H / PIECE_SRC_W;
  const cellW = tune.cellSize;
  const cellH = tune.cellSize * aspect;
  const pieceH = tune.pieceSize;
  const pieceW = pieceH / aspect;
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

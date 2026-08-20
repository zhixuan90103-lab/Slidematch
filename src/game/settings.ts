import { COLS, FRAME_WIDTH, ROWS } from './config';

const KEY = 'slidematch.tune.v4';

export type Tune = {
  visualWidth: number;
  visualHeight: number;
  spacing: number;
  pieceSize: number;
  cellSize: number;
  cellOpacity: number;
};

export const TUNE_DEFAULTS: Tune = {
  visualWidth: 380,
  visualHeight: 380,
  spacing: 3,
  pieceSize: 34,
  cellSize: 38,
  cellOpacity: 100,
};

export type BoardLayout = {
  visualWidth: number;
  visualHeight: number;
  cellW: number;
  cellH: number;
  spacing: number;
  piece: number;
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
      pieceSize: clamp(parsed.pieceSize ?? TUNE_DEFAULTS.pieceSize, 16, 48),
      cellSize: clamp(parsed.cellSize ?? TUNE_DEFAULTS.cellSize, 20, 56),
      cellOpacity: clamp(parsed.cellOpacity ?? TUNE_DEFAULTS.cellOpacity, 0, 100),
    };
  } catch {
    return { ...TUNE_DEFAULTS };
  }
}

export function saveTune(tune: Tune): void {
  localStorage.setItem(KEY, JSON.stringify(tune));
}

/** 每项只改自己：框、格、缝、棋子、格透明度互不改写其它量。 */
export function computeLayout(tune: Tune): BoardLayout {
  const cellW = tune.cellSize;
  const cellH = tune.cellSize;
  const gridWidth = COLS * cellW + (COLS - 1) * tune.spacing;
  const gridHeight = ROWS * cellH + (ROWS - 1) * tune.spacing;
  return {
    visualWidth: tune.visualWidth,
    visualHeight: tune.visualHeight,
    cellW,
    cellH,
    spacing: tune.spacing,
    piece: tune.pieceSize,
    frameWidth: FRAME_WIDTH,
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

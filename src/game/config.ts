/** 棋盘资源与设计常量再导出。数字真源：`design.ts` / docs/BOARD.md。 */

import pieceDrop from '../assets/piece-drop.png';
import pieceLeaf from '../assets/piece-leaf.png';
import pieceSun from '../assets/piece-sun.png';
import pieceHeart from '../assets/piece-heart.png';
import pieceStar from '../assets/piece-star.png';
import pieceConvert from '../assets/piece-convert.png';
import pieceMagic from '../assets/piece-magic.png';
import { ART, GRID, LOOK, RULES, itemPopPeakU } from './design';

const yawMods = import.meta.glob('../assets/fx-preview/yaw-2d/*/*_yaw_*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const YAW_FOLDER_COLOR: Record<string, number> = {
  drop: 0,
  leaf: 1,
  sun: 2,
  heart: 3,
  star: 4,
};

function parseYawPath(path: string): { folder: string; frame: number } | null {
  const m = path.match(/yaw-2d\/([^/]+)\/[^/]*_yaw_(\d+)\.png$/);
  if (!m) return null;
  return { folder: m[1]!, frame: Number(m[2]) };
}

function sortedYaw(folder: string): string[] {
  return Object.entries(yawMods)
    .filter(([p]) => parseYawPath(p)?.folder === folder)
    .sort((a, b) => (parseYawPath(a[0])?.frame ?? 0) - (parseYawPath(b[0])?.frame ?? 0))
    .map(([, url]) => url);
}

function yawByFrames(folder: string, frames: number[]): string[] {
  const byFrame = new Map<number, string>();
  for (const [p, url] of Object.entries(yawMods)) {
    const parsed = parseYawPath(p);
    if (!parsed || parsed.folder !== folder) continue;
    byFrame.set(parsed.frame, url);
  }
  return frames.map((f) => byFrame.get(f)).filter((u): u is string => !!u);
}

/** 变色子弹出放大阶段：00–06 + 19–23。峰值后切回 `piece-convert.png`。 */
export const CONVERT_YAW_SRC = sortedYaw('convert');

/** 换锁色：原色翻出 00–06。 */
export const CONVERT_RECOLOR_OUT = 7;
/** 换锁色：新色翻回 19–23。 */
export const CONVERT_RECOLOR_IN = 5;

const RECOLOR_OUT_FRAMES = [0, 1, 2, 3, 4, 5, 6];
const RECOLOR_IN_FRAMES = [19, 20, 21, 22, 23];

export const PIECE_YAW_OUT: string[][] = [];
export const PIECE_YAW_IN: string[][] = [];
for (const [folder, color] of Object.entries(YAW_FOLDER_COLOR)) {
  PIECE_YAW_OUT[color] = yawByFrames(folder, RECOLOR_OUT_FRAMES);
  PIECE_YAW_IN[color] = yawByFrames(folder, RECOLOR_IN_FRAMES);
}

for (const src of [
  ...CONVERT_YAW_SRC,
  ...PIECE_YAW_OUT.flat(),
  ...PIECE_YAW_IN.flat(),
]) {
  const img = new Image();
  img.src = src;
}

export {
  APP,
  ART,
  clearMotion,
  gatherMotion,
  synthGatherTimes,
  synthPopAmp,
  itemPopMotion,
  convertRecolorScale,
  FEEL,
  GRID,
  HUD,
  LOOK,
  PIECE_ASPECT,
  PIECE_DRAW,
  PIECE_FX_COLOR,
  RULES,
  STAGE,
  clampPieceDpr,
  pieceDropShadowFilter,
  pieceLayerTransform,
} from './design';

export { itemPopPeakU };

export const ROWS = GRID.rows;
export const COLS = GRID.cols;
export const CELL_SIZE = LOOK.cellSize;
export const PIECE_SIZE = LOOK.pieceSize;
export const PIECE_SRC_W = ART.pieceSrcW;
export const PIECE_SRC_H = ART.pieceSrcH;
export const SPACING = LOOK.spacing;
export const FRAME_SLICE = ART.frameSlice;
export const FRAME_SCALE = ART.frameScale;
export const FRAME_WIDTH = Math.round(ART.frameSlice * ART.frameScale);
export const COLOR_COUNT = RULES.colorCount;
export const PATH_MIN = RULES.pathMin;
export const ITEM_MIN = RULES.itemMin;
export const MAGIC_MIN = RULES.magicMin;
export const CONVERT_COLOR = RULES.convertColor;
export const MAGIC_COLOR = RULES.magicColor;
export const SCORE_UNIT = RULES.scoreUnit;
export const SCORE_CONVERT_MUL = RULES.scoreConvertMul;
export const SCORE_MAGIC_MUL = RULES.scoreMagicMul;

export function isConvertColor(color: number): boolean {
  return color === CONVERT_COLOR;
}

export function isMagicColor(color: number): boolean {
  return color === MAGIC_COLOR;
}

export function isItemColor(color: number): boolean {
  return isConvertColor(color) || isMagicColor(color);
}

/** 盘面 0–2；5 convert；6 magic */
export const PIECE_SRC = [
  pieceDrop,
  pieceLeaf,
  pieceSun,
  pieceHeart,
  pieceStar,
  pieceConvert,
  pieceMagic,
] as const;

/** 放大未到峰值时返回 yaw 帧；否则 `null`（用静图）。 */
export function convertPopYawSrc(u: number, amp = 1): string | null {
  const n = CONVERT_YAW_SRC.length;
  if (n <= 0) return null;
  const peak = itemPopPeakU(amp);
  if (u >= peak) return null;
  const t = Math.min(1, Math.max(0, u / peak));
  const i = Math.min(n - 1, Math.floor(t * n));
  return CONVERT_YAW_SRC[i] ?? null;
}

export function convertRecolorShown(from: number, to: number, u: number): number {
  if (u >= 1) return to;
  const n = CONVERT_RECOLOR_OUT + CONVERT_RECOLOR_IN;
  const i = Math.min(n - 1, Math.floor(Math.max(0, u) * n));
  return i < CONVERT_RECOLOR_OUT ? from : to;
}

/** 换锁色过程中的 yaw；`u>=1` 或缺帧则 `null`（用目标静图）。 */
export function convertRecolorSrc(from: number, to: number, u: number): string | null {
  if (u >= 1) return null;
  const out = PIECE_YAW_OUT[from];
  const inn = PIECE_YAW_IN[to];
  if (!out?.length || !inn?.length) return null;
  const nOut = out.length;
  const nIn = inn.length;
  const n = nOut + nIn;
  const t = Math.min(0.9999, Math.max(0, u));
  const i = Math.min(n - 1, Math.floor(t * n));
  if (i < nOut) return out[i] ?? null;
  return inn[i - nOut] ?? null;
}

/** 棋盘资源与设计常量再导出。数字真源：`design.ts` / docs/BOARD.md。 */

import pieceDrop from '../assets/piece-drop.png';
import pieceLeaf from '../assets/piece-leaf.png';
import pieceSun from '../assets/piece-sun.png';
import pieceHeart from '../assets/piece-heart.png';
import pieceStar from '../assets/piece-star.png';
import pieceConvert from '../assets/piece-convert.png';
import pieceMagic from '../assets/piece-magic.png';
import { ART, GRID, LOOK, RULES, itemPopPeakU } from './design';

const convertYawMods = import.meta.glob('../assets/fx-preview/yaw-2d/convert/convert_yaw_*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function yawFrameIndex(path: string): number {
  const m = path.match(/convert_yaw_(\d+)\.png$/);
  return m ? Number(m[1]) : -1;
}

/** 变色子弹出放大阶段：00–06 + 19–23。峰值后切回 `piece-convert.png`。 */
export const CONVERT_YAW_SRC = Object.entries(convertYawMods)
  .sort((a, b) => yawFrameIndex(a[0]) - yawFrameIndex(b[0]))
  .map(([, url]) => url);

for (const src of CONVERT_YAW_SRC) {
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

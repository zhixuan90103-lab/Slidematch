/** 棋盘资源与设计常量再导出。数字真源：`design.ts` / docs/BOARD.md。 */

import pieceDrop from '../assets/piece-drop.png';
import pieceLeaf from '../assets/piece-leaf.png';
import pieceSun from '../assets/piece-sun.png';
import pieceHeart from '../assets/piece-heart.png';
import pieceStar from '../assets/piece-star.png';
import pieceConvert from '../assets/piece-convert.png';
import pieceMagic from '../assets/piece-magic.png';
import { ART, GRID, LOOK, RULES } from './design';

export {
  APP,
  ART,
  FEEL,
  GRID,
  HUD,
  LOOK,
  PIECE_ASPECT,
  PIECE_DRAW,
  RULES,
  STAGE,
  clampPieceDpr,
  pieceDropShadowFilter,
  pieceLayerTransform,
} from './design';

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

/** Board layout — docs/BOARD.md. Design pixels on the 390×844 stage. */

import pieceDrop from '../assets/piece-drop.png';
import pieceLeaf from '../assets/piece-leaf.png';
import pieceSun from '../assets/piece-sun.png';
import pieceHeart from '../assets/piece-heart.png';
import pieceStar from '../assets/piece-star.png';

export const ROWS = 6;
export const COLS = 6;
export const CELL_SIZE = 60;
export const PIECE_SIZE = 65;
/** 素材 360×430，宽随高按此比，不裁切。 */
export const PIECE_SRC_W = 360;
export const PIECE_SRC_H = 430;
export const SPACING = 0;
export const BOARD_WIDTH = COLS * CELL_SIZE + (COLS - 1) * SPACING;
export const BOARD_HEIGHT = ROWS * CELL_SIZE + (ROWS - 1) * SPACING;

export const BOARD_LEFT = (390 - BOARD_WIDTH) / 2;
export const BOARD_TOP = (844 - BOARD_HEIGHT) / 2 + 13;

/** PNG 九宫切片（素材像素，奶油圆角+内沿）。 */
export const FRAME_SLICE = 48;
/** 切片 → 舞台显示比例。 */
export const FRAME_SCALE = 0.4;
export const FRAME_WIDTH = Math.round(FRAME_SLICE * FRAME_SCALE);
/** 棋子 Mask 相对内框每边再放出的设计像素。 */
export const BOARD_MASK_EXPAND = 6;

export const HIT_RADIUS = CELL_SIZE * 0.8;

/** 0 drop 1 leaf 2 sun 3 heart 4 star */
export const COLOR_COUNT = 5;

export const PIECE_SRC = [
  pieceDrop,
  pieceLeaf,
  pieceSun,
  pieceHeart,
  pieceStar,
] as const;

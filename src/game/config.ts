/** Board layout — docs/BOARD.md. Design pixels on the 390×844 stage. */

import pieceHeart from '../assets/piece-heart.png';
import pieceBiscuit from '../assets/piece-biscuit.png';
import pieceDonut from '../assets/piece-donut.png';
import pieceJelly from '../assets/piece-jelly.png';
import pieceMacaron from '../assets/piece-macaron.png';

export const ROWS = 9;
export const COLS = 9;
export const CELL_SIZE = 38;
export const PIECE_SIZE = 34;
export const SPACING = 3;
export const BOARD_WIDTH = COLS * CELL_SIZE + (COLS - 1) * SPACING;
export const BOARD_HEIGHT = ROWS * CELL_SIZE + (ROWS - 1) * SPACING;

export const BOARD_LEFT = (390 - BOARD_WIDTH) / 2;
export const BOARD_TOP = (844 - BOARD_HEIGHT) / 2 + 13;

/** PNG 九宫切片（素材像素，800² 框约 40px 含圆角+白边）。改 FRAME_WIDTH 只变显示厚度。 */
export const FRAME_SLICE = 40;
/** 舞台上框的显示厚度（设计像素）。左右各一圈，需 ≤ BOARD_LEFT（10.5）。 */
export const FRAME_WIDTH = 10;

export const HIT_RADIUS = CELL_SIZE * 0.8;

/** 0 heart 1 biscuit 2 donut 3 jelly 4 macaron */
export const COLOR_COUNT = 5;

export const PIECE_SRC = [
  pieceHeart,
  pieceBiscuit,
  pieceDonut,
  pieceJelly,
  pieceMacaron,
] as const;

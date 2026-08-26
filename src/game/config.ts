/** 棋盘资源与设计常量再导出。数字真源：`design.ts` / docs/BOARD.md。 */

import pieceDrop from '../assets/piece-drop.png';
import pieceLeaf from '../assets/piece-leaf.png';
import pieceSun from '../assets/piece-sun.png';
import pieceHeart from '../assets/piece-heart.png';
import pieceStar from '../assets/piece-star.png';
import pieceConvert from '../assets/piece-convert.png';
import pieceMagic from '../assets/piece-magic.png';
import goldSrc from '../assets/coin.png';
import { ART, FEEL, GRID, LOOK, RULES, itemPopPeakU } from './design';

const yawStripMods = import.meta.glob('../assets/fx-preview/yaw-2d/*/yaw_strip.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const YAW_FOLDER_COLOR: Record<string, number> = {
  drop: 0,
  leaf: 1,
  sun: 2,
  heart: 3,
  star: 4,
  convert: 5,
  magic: 6,
};

/** 横条动画帧：00–06 + 19–23。 */
export const YAW_STRIP_FRAMES = 12;
/** 横条总格：动画 + 末格静图（棋子静图 / 金币 `coin.png` / 白板 00）。 */
export const YAW_SHEET_FRAMES = YAW_STRIP_FRAMES + 1;
/** 停稳落在末格，同一张图不换 URL。 */
export const YAW_REST_I = YAW_SHEET_FRAMES - 1;
export const COIN_STRIP_FRAMES = YAW_SHEET_FRAMES;
export const GOLD_REST_I = YAW_REST_I;

function stripFor(folder: string): string {
  for (const [p, url] of Object.entries(yawStripMods)) {
    if (p.includes(`/yaw-2d/${folder}/yaw_strip.png`)) return url;
  }
  return '';
}

function colorFolder(color: number): string {
  if (color === 7) return 'magic_bai';
  for (const [folder, id] of Object.entries(YAW_FOLDER_COLOR)) {
    if (id === color) return folder;
  }
  return 'drop';
}

/** 变色 / 魔法弹出放大阶段：00–06 + 19–23。峰值后切回静图。 */
export const CONVERT_YAW_SRC = [stripFor('convert')];
export const MAGIC_YAW_SRC = [stripFor('magic')];

/** 换锁色：原色翻出 00–06。 */
export const CONVERT_RECOLOR_OUT = 7;
/** 换锁色：新色翻回 19–23。 */
export const CONVERT_RECOLOR_IN = 5;

export type LookFrame = { src: string; i: number; n: number };

const LOOK_PRELOAD_SRCS = [...new Set(Object.values(yawStripMods))];

export {
  APP,
  ART,
  clearMotion,
  gatherMotion,
  synthGatherTimes,
  synthPopAmp,
  itemPopMotion,
  convertRecolorScale,
  coinAppearMotion,
  GRID,
  HUD,
  LOOK,
  PIECE_ASPECT,
  PIECE_DRAW,
  PIECE_FX_COLOR,
  RULES,
  colorCountForScore,
  STAGE,
  clampPieceDpr,
  pieceDropShadowFilter,
  pieceLayerTransform,
} from './design';

export { FEEL, itemPopPeakU };

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
export const COLOR_COUNT_MAX = RULES.colorCountMax;
export const PATH_MIN = RULES.pathMin;
export const ITEM_MIN = RULES.itemMin;
export const MAGIC_MIN = RULES.magicMin;
export const CONVERT_COLOR = RULES.convertColor;
export const MAGIC_COLOR = RULES.magicColor;
/** 魔法滑动中全盘白板显示（不是盘面色号）。 */
export const COIN_LOOK = 7;
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

export const COIN_SRC = stripFor('magic_bai');
export const GOLD_SRC = goldSrc;

const LOOK_WARM_SRCS = [
  ...new Set(
    [stripFor('coin'), stripFor('magic_bai'), ...LOOK_PRELOAD_SRCS, GOLD_SRC, COIN_SRC, ...PIECE_SRC].filter(
      Boolean,
    ),
  ),
];
const LOOK_DECODED = new Map<string, HTMLImageElement>();

/** 解码 yaw/金币，避免第一次点魔法时主线程卡死。 */
export function warmupLookAssets(): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');
  const run = async () => {
    for (let i = 0; i < LOOK_WARM_SRCS.length; i += 6) {
      const batch = LOOK_WARM_SRCS.slice(i, i + 6);
      await Promise.all(
        batch.map(async (src) => {
          let im = LOOK_DECODED.get(src);
          if (!im) {
            im = new Image();
            im.decoding = 'async';
            im.src = src;
            LOOK_DECODED.set(src, im);
          }
          try {
            await im.decode();
          } catch {
            /* ignore */
          }
          try {
            ctx?.drawImage(im, 0, 0, 1, 1);
          } catch {
            /* ignore */
          }
        }),
      );
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
  };
  return run();
}

void warmupLookAssets();

export function pieceSrc(color: number): string {
  return pieceLook(color).src;
}

export function pieceLook(color: number): LookFrame {
  const src = stripFor(colorFolder(color));
  if (src) return { src, i: YAW_REST_I, n: YAW_SHEET_FRAMES };
  return { src: PIECE_SRC[color] ?? PIECE_SRC[0]!, i: 0, n: 1 };
}

function yawIndex(u: number, n: number): number {
  const t = Math.min(0.9999, Math.max(0, u));
  return Math.min(n - 1, Math.floor(t * n));
}

/** 放大未到峰值时返回 yaw 帧；否则 `null`（用静图）。 */
export function itemPopYawLook(folder: string, u: number, amp = 1): LookFrame | null {
  const src = stripFor(folder);
  if (!src) return null;
  const peak = itemPopPeakU(amp);
  if (u >= peak) return null;
  const t = Math.min(1, Math.max(0, u / peak));
  return { src, i: yawIndex(t, YAW_STRIP_FRAMES), n: YAW_SHEET_FRAMES };
}

export function convertPopYawLook(u: number, amp = 1): LookFrame | null {
  return itemPopYawLook('convert', u, amp);
}

export function magicPopYawLook(u: number, amp = 1): LookFrame | null {
  return itemPopYawLook('magic', u, amp);
}

export function convertRecolorSec(from: number, to: number): number {
  if (from === COIN_LOOK && to !== COIN_LOOK) return FEEL.convert.recolorBackSec;
  return FEEL.convert.recolorSec;
}

export function convertRecolorShown(from: number, to: number, u: number): number {
  if (u <= 0) return from;
  if (u >= 1) return to;
  const n = CONVERT_RECOLOR_OUT + CONVERT_RECOLOR_IN;
  const i = Math.min(n - 1, Math.floor(Math.max(0, u) * n));
  return i < CONVERT_RECOLOR_OUT ? from : to;
}

/** 换锁色 / 翻成白板。停稳停在目标横条最后一帧，不切静图。 */
export function convertRecolorLook(from: number, to: number, u: number): LookFrame | null {
  if (u <= 0) return pieceLook(from);
  if (u >= 1) return pieceLook(to);
  const n = CONVERT_RECOLOR_OUT + CONVERT_RECOLOR_IN;
  const i = yawIndex(u, n);
  const folder = i < CONVERT_RECOLOR_OUT ? colorFolder(from) : colorFolder(to);
  const src = stripFor(folder);
  if (!src) return null;
  return { src, i, n: YAW_SHEET_FRAMES };
}

export function isMagicRecolor(from: number, to: number): boolean {
  return from === COIN_LOOK || to === COIN_LOOK;
}

function sheetLook(folder: string, i: number): LookFrame {
  const src = stripFor(folder);
  return { src, i, n: YAW_SHEET_FRAMES };
}

/** 魔法翻：底板只播原色 00–06，不换成白板横条。 */
export function convertPieceLook(from: number, to: number, u: number): LookFrame {
  if (to === COIN_LOOK) {
    const folder = colorFolder(from);
    if (u <= 0) return pieceLook(from);
    const i = yawIndex(u, CONVERT_RECOLOR_OUT + CONVERT_RECOLOR_IN);
    if (i < CONVERT_RECOLOR_OUT) return sheetLook(folder, i);
    return sheetLook(folder, CONVERT_RECOLOR_OUT - 1);
  }
  if (from === COIN_LOOK) {
    const folder = colorFolder(to);
    if (u >= 1) return pieceLook(to);
    const i = yawIndex(u, CONVERT_RECOLOR_OUT + CONVERT_RECOLOR_IN);
    if (i < CONVERT_RECOLOR_OUT) return pieceLook(to);
    return sheetLook(folder, i);
  }
  return convertRecolorLook(from, to, u) ?? pieceLook(to);
}

export function blankRestLook(): LookFrame {
  return sheetLook('magic_bai', YAW_REST_I);
}

/** 白板 overlay：只播 magic_bai。 */
export function convertBlankLook(from: number, to: number, u: number): LookFrame {
  if (to === COIN_LOOK) {
    if (u >= 1) return blankRestLook();
    const i = yawIndex(Math.max(0, u), CONVERT_RECOLOR_OUT + CONVERT_RECOLOR_IN);
    if (i < CONVERT_RECOLOR_OUT) return blankRestLook();
    return sheetLook('magic_bai', i);
  }
  if (from === COIN_LOOK) {
    if (u <= 0) return blankRestLook();
    const i = yawIndex(u, CONVERT_RECOLOR_OUT + CONVERT_RECOLOR_IN);
    if (i < CONVERT_RECOLOR_OUT) return sheetLook('magic_bai', i);
    return sheetLook('magic_bai', CONVERT_RECOLOR_OUT - 1);
  }
  return blankRestLook();
}

export function convertPieceShown(from: number, to: number, u: number): boolean {
  if (to === COIN_LOOK) {
    if (u <= 0) return true;
    if (u >= 1) return false;
    return yawIndex(u, CONVERT_RECOLOR_OUT + CONVERT_RECOLOR_IN) < CONVERT_RECOLOR_OUT;
  }
  if (from === COIN_LOOK) {
    if (u <= 0) return false;
    if (u >= 1) return true;
    return yawIndex(u, CONVERT_RECOLOR_OUT + CONVERT_RECOLOR_IN) >= CONVERT_RECOLOR_OUT;
  }
  return true;
}

export function convertBlankShown(from: number, to: number, u: number): boolean {
  if (to === COIN_LOOK) {
    if (u <= 0) return false;
    if (u >= 1) return true;
    return yawIndex(u, CONVERT_RECOLOR_OUT + CONVERT_RECOLOR_IN) >= CONVERT_RECOLOR_OUT;
  }
  if (from === COIN_LOOK) {
    if (u >= 1) return false;
    if (u <= 0) return true;
    return yawIndex(u, CONVERT_RECOLOR_OUT + CONVERT_RECOLOR_IN) < CONVERT_RECOLOR_OUT;
  }
  return false;
}

export function goldSpinLook(u: number, reverse: boolean): LookFrame {
  const coin = stripFor('coin');
  if (!coin) return { src: GOLD_SRC, i: 0, n: 1 };
  if (reverse) {
    if (u >= 1) return { src: coin, i: YAW_REST_I, n: COIN_STRIP_FRAMES };
    return { src: coin, i: yawIndex(u, YAW_STRIP_FRAMES), n: COIN_STRIP_FRAMES };
  }
  if (u >= 1) return { src: coin, i: GOLD_REST_I, n: COIN_STRIP_FRAMES };
  return { src: coin, i: yawIndex(u, COIN_STRIP_FRAMES), n: COIN_STRIP_FRAMES };
}

export function goldSpinLoopLook(u: number): LookFrame {
  const coin = stripFor('coin');
  if (!coin) return { src: GOLD_SRC, i: 0, n: 1 };
  const t = u - Math.floor(u);
  return { src: coin, i: yawIndex(t, YAW_STRIP_FRAMES), n: COIN_STRIP_FRAMES };
}

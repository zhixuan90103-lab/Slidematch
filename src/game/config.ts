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
  convert: 5,
  magic: 6,
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

/** 变色 / 魔法弹出放大阶段：00–06 + 19–23。峰值后切回静图。 */
export const CONVERT_YAW_SRC = sortedYaw('convert');
export const MAGIC_YAW_SRC = sortedYaw('magic');

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

const BLANK_YAW_OUT = yawByFrames('magic_bai', RECOLOR_OUT_FRAMES);
const BLANK_YAW_IN = yawByFrames('magic_bai', RECOLOR_IN_FRAMES);
const GOLD_YAW_OUT = yawByFrames('coin', RECOLOR_OUT_FRAMES);
const GOLD_YAW_IN = yawByFrames('coin', RECOLOR_IN_FRAMES);
/** 与棋子翻牌相同：00–06 + 19–23。 */
const GOLD_SPIN = [...GOLD_YAW_OUT, ...GOLD_YAW_IN];

for (const src of [
  ...CONVERT_YAW_SRC,
  ...MAGIC_YAW_SRC,
  ...BLANK_YAW_OUT,
  ...BLANK_YAW_IN,
  ...GOLD_SPIN,
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
  coinAppearMotion,
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

export const COIN_SRC = BLANK_YAW_OUT[0] ?? PIECE_SRC[6]!;
export const GOLD_SRC = goldSrc;

export function pieceSrc(color: number): string {
  if (color === COIN_LOOK) return COIN_SRC;
  return PIECE_SRC[color] ?? PIECE_SRC[0]!;
}

/** 放大未到峰值时返回 yaw 帧；否则 `null`（用静图）。 */
export function itemPopYawSrc(frames: readonly string[], u: number, amp = 1): string | null {
  const n = frames.length;
  if (n <= 0) return null;
  const peak = itemPopPeakU(amp);
  if (u >= peak) return null;
  const t = Math.min(1, Math.max(0, u / peak));
  const i = Math.min(n - 1, Math.floor(t * n));
  return frames[i] ?? null;
}

export function convertPopYawSrc(u: number, amp = 1): string | null {
  return itemPopYawSrc(CONVERT_YAW_SRC, u, amp);
}

export function magicPopYawSrc(u: number, amp = 1): string | null {
  return itemPopYawSrc(MAGIC_YAW_SRC, u, amp);
}

function yawOutFrames(color: number): string[] {
  if (color === COIN_LOOK) return BLANK_YAW_OUT;
  return PIECE_YAW_OUT[color] ?? [];
}

function yawInFrames(color: number): string[] {
  if (color === COIN_LOOK) return BLANK_YAW_IN;
  return PIECE_YAW_IN[color] ?? [];
}

function convertRecolorFrames(from: number, to: number): string[] {
  return [...yawOutFrames(from), ...yawInFrames(to)];
}

export function convertRecolorSec(from: number, to: number): number {
  if (from === COIN_LOOK && to !== COIN_LOOK) return FEEL.convert.recolorBackSec;
  return FEEL.convert.recolorSec;
}

export function convertRecolorShown(from: number, to: number, u: number): number {
  if (u <= 0) return from;
  if (u >= 1) return to;
  const nOut = yawOutFrames(from).length;
  const n = Math.max(1, nOut + yawInFrames(to).length);
  const i = Math.min(n - 1, Math.floor(Math.max(0, u) * n));
  return i < nOut ? from : to;
}

/** 换锁色 / 翻成白板；`u>=1` 或缺帧则 `null`。 */
export function convertRecolorSrc(from: number, to: number, u: number): string | null {
  if (u <= 0 || u >= 1) return null;
  const frames = convertRecolorFrames(from, to);
  if (!frames.length) return null;
  const t = Math.min(0.9999, Math.max(0, u));
  const i = Math.min(frames.length - 1, Math.floor(t * frames.length));
  return frames[i] ?? null;
}

/** 正向：全序列一遍后停 `coin.png`。抬手翻回：`00–06`→`19–23`，与换锁色同一套。 */
export function goldSpinSrc(u: number, reverse: boolean): string {
  const loop = reverse ? GOLD_SPIN : GOLD_SRC ? [...GOLD_SPIN, GOLD_SRC] : GOLD_SPIN;
  if (!loop.length) return GOLD_SRC;
  if (u >= 1) return reverse ? loop[loop.length - 1]! : GOLD_SRC;
  const n = loop.length;
  const t = Math.min(0.9999, Math.max(0, u));
  const i = Math.min(n - 1, Math.floor(t * n));
  return loop[i] ?? GOLD_SRC;
}

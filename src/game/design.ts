/**
 * 产品设计（已冻结）。视觉数字真源；玩法语义见 docs/DESIGN.md，盘面见 docs/BOARD.md。
 * 调参面板只覆盖 LOOK 同名字段，不另开一套默认。
 */

export const STAGE = {
  width: 390,
  height: 844,
  bg: '#fdf1e7',
  /** 棋盘相对舞台垂直中心再下移。 */
  boardOffsetY: 13,
} as const;

export const GRID = {
  rows: 6,
  cols: 6,
} as const;

/** 素材像素与九宫切片。棋子/浅格同一长宽比，显示时不裁切。 */
export const ART = {
  pieceSrcW: 360,
  pieceSrcH: 430,
  frameSlice: 48,
  frameScale: 0.4,
} as const;

export const PIECE_ASPECT = ART.pieceSrcH / ART.pieceSrcW;

/**
 * 盘面默认。格子大小、棋子大小都指**宽度**，高度 = 宽 × 430/360。
 * 默认格子略大于棋子，浅格从棋子四周露出一圈。
 */
export const LOOK = {
  visualWidth: 380,
  visualHeight: 450,
  spacing: 0,
  pieceSize: 56,
  cellSize: 60,
  cellOpacity: 15,
  /** 下落初速 px/s。少格主要看这个。 */
  dropV0: 600,
  /** 下落加速度 px/s²。多格越掉越快。 */
  dropAccel: 1400,
  /** 下落速度上限 px/s。太长就顶住。 */
  dropVMax: 1600,
  maskInset: 7,
  maskRadius: 5,
} as const;

export const RULES = {
  /** 抬手有效路径最短长度。 */
  pathMin: 2,
  colorCount: 3,
  /** 4 = 只横竖；对角非法。 */
  neighborhood: 4,
  /** 普通划（路径无道具）≥ 此值，队尾出变色子。 */
  itemMin: 5,
  /** 普通划（路径无道具）≥ 此值，队尾出魔法子（不出变色）。 */
  magicMin: 10,
  /** colors[] 哨兵：变色子。 */
  convertColor: 5,
  /** colors[] 哨兵：魔法子。 */
  magicColor: 6,
  /** 抬手结算：unit × 消除格数² × 倍率。 */
  scoreUnit: 1,
  /** 滑动中每连一格加这么多（预览，未进累计）。1–9 格即个位 1–9。 */
  scoreLinkUnit: 1,
  /** 路径含变色且无魔法。 */
  scoreConvertMul: 2,
  /** 路径含魔法（优先于变色，不叠乘）。 */
  scoreMagicMul: 3,
  /** HUD 数字滚动最短/最长（秒）。 */
  scoreRollMinSec: 0.2,
  scoreRollMaxSec: 0.9,
  /** 每差 1 分额外加的滚动时间（秒）。 */
  scoreRollPerPoint: 0.0012,
} as const;

export const HUD = {
  label: 'SCORE',
  labelColor: '#c47ee0',
  scoreColor: '#8f5a3c',
  font: 'Inter',
} as const;

export const APP = {
  id: 'com.slidematch.play',
  name: 'SlideMatch',
} as const;

/**
 * 棋子绘制。素材是实心黏土圆角牌，仅四角 Alpha；不要 CSS 圆角裁切，不要矩形 box-shadow。
 * WebKit 对 translate3d 合成层常按 1× CSS 栅格化：位图按 DPR 放大（上限 dprMax）再 scale 回去。
 */
export const PIECE_DRAW = {
  dprMax: 3,
  shadowX: 0,
  shadowY: 3,
  shadowBlur: 1,
  shadowColor: 'rgba(90, 55, 80, 0.42)',
} as const;

export function clampPieceDpr(devicePixelRatio: number): number {
  return Math.max(1, Math.min(devicePixelRatio || 1, PIECE_DRAW.dprMax));
}

export function pieceDropShadowFilter(dpr: number): string {
  const d = clampPieceDpr(dpr);
  return `drop-shadow(${PIECE_DRAW.shadowX * d}px ${PIECE_DRAW.shadowY * d}px ${PIECE_DRAW.shadowBlur * d}px ${PIECE_DRAW.shadowColor})`;
}

/** 原点在布局盒左上。落地挤压绕底边中心，最后按 1/dpr 缩回显示大小。 */
export function pieceLayerTransform(
  x: number,
  y: number,
  scaleX: number,
  scaleY: number,
  pieceW: number,
  pieceH: number,
  dpr: number,
): string {
  const inv = 1 / clampPieceDpr(dpr);
  return `translate3d(${x}px,${y}px,0) translate(${pieceW / 2}px,${pieceH}px) scale(${scaleX},${scaleY}) translate(${-pieceW / 2}px,${-pieceH}px) scale(${inv})`;
}

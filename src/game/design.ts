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

/** 反馈数字。语义见 docs/FEEDBACK.md。不进设置调参。 */
export const FEEL = {
  select: {
    otherOpacity: 0.5,
    glowOpacity: 0.18,
    scale: 1.05,
    lift: 6,
    spring: 480,
    damp: 12,
    popVel: 7.5,
    wobble: 0.28,
    dipVel: 90,
    dipSpring: 520,
    dipDamp: 14,
    outSec: 0.15,
    dimSec: 0.08,
    idleLift: 0.3,
    idleHz: 0.85,
    badgeSize: 18,
    /** 当前队尾（手指所在格）角标。 */
    badgeSizeNow: 30,
    badgeOut: 9,
    /** 出现、队尾放大/缩小：到点即停。 */
    badgeSnapSec: 0.12,
  },
  clear: {
    sec: 0.15,
    liftEnd: 10,
    extraStagger: 0,
  },
  convert: {
    tickSec: 0.07,
    /** 散子选完后，剩下的气泡数字在这段时间内跑完。 */
    tickEmptySpan: 0.12,
    countLift: 28,
    glowSec: 0.16,
    holdSec: 0.5,
    /** 散消标记 Additive 透明度。 */
    markGlow: 0.1,
    /** 魔法白板 Additive。金币仍用 select.glowOpacity 0.18。 */
    blankGlow: 0.05,
    /** 路径普通子换锁色：yaw 翻面时长。 */
    recolorSec: 0.2,
    /** 魔法取消翻回时长。 */
    recolorBackSec: 0.3,
    /** 金币出场结束时的缩放。 */
    coinScale: 0.9,
    coinScaleFrom: 0.4,
    coinScaleMax: 1.2,
    /** 金币放大时上浮（px）。回落带落地回弹。 */
    coinLift: 8,
    /** 金币 yaw 一遍时长（停在默认金币图）。 */
    coinSpinSec: 0.4,
    /** 金币翻面相对底板翻面的延迟。 */
    coinDelaySec: 0.1,
    /** 淡入在金币播放进度的这一处完成（1 = 整段播完才淡满）。 */
    coinFadeEnd: 0.5,
    /** 翻牌：1 → 放大 → 1，峰值在侧棱（绕中心）。 */
    recolorScale: 1.35,
    /** 魔法翻牌按圈扩散：每圈（切比雪夫）延迟。 */
    rippleStepSec: 0.05,
    /** 魔法消除：金币飞向 SCORE 的时长 / 错开 / 弧高 / 终点缩放。 */
    scoreFlySec: 0.48,
    /** 飞向 SCORE：同一飞行速度；行与行错开，同行内列只差一点点。 */
    scoreFlyRowStagger: 0.07,
    scoreFlyColStagger: 0.01,
    scoreFlyArc: 12,
    /** 飞向 SCORE 缩放：前 1/3 放大，后 2/3 收到 0.4。 */
    scoreFlyStartScale: 1,
    scoreFlyPeakScale: 1.15,
    scoreFlyEndScale: 0.4,
    /** 松手选中散子：停住比路径更大，过冲更大。 */
    scale: 1.1,
    lift: 9,
    popVel: 24,
    spring: 320,
    damp: 8,
    wobble: 0,
  },
  fx: {
    countMin: 3,
    countMax: 5,
    life: 0.75,
    speed: 90,
    gravity: 980,
    size: 8,
    sizeJitter: 0.4,
    emitR: 16,
  },
  /** 路径合成道具：依次飞向队尾，再弹出道具。 */
  synth: {
    stagger: 0.026,
    flySec: 0.17,
    /** 飞入结束时的透明度（与缩小同一条 t²）。 */
    flyOpacityEnd: 0,
    /** 整段飞入对齐这个格数的时长（5 格：0.274s）。 */
    refCount: 5,
    staggerMin: 0.014,
    spawnSec: 0.4,
    /** 队尾收完前提前弹出（秒）。 */
    spawnLead: 0.1,
    /** 最后一颗开始飞后再过这么久，路径格一起腾格。 */
    vacateSec: 0.12,
    overshoot: 5,
    popLift: 8,
    /** 回原位后的位移过冲（px）。 */
    popLand: 6,
    popSpin: 20,
    popWobble: 14,
    popIdle: 0.055,
    /** 比 5 格每多 1 子，弹出缩放加这一档。 */
    popAmpPer: 0.08,
    popAmpMax: 1.5,
    magicMul: 1.12,
  },
} as const;

/** 碎屑颜色：0 水滴 1 叶 2 太阳 5 变色 6 魔法 7 白板外观。 */
export const PIECE_FX_COLOR = [
  '#62b4f2',
  '#8ed65e',
  '#f4b03a',
  '#e88aaa',
  '#b08ae0',
  '#f0c0d4',
  '#f0c44a',
  '#f3e4ea',
] as const;

function mixHex(hex: string, toward: number, t: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.min(255, Math.round(c + (toward - c) * t));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** 路径角标：浅底 + 棋子色字，比满色圆点弱。 */
export function pieceBadgeStyle(color: number): { bg: string; fg: string } {
  const hex = PIECE_FX_COLOR[color] ?? PIECE_FX_COLOR[0]!;
  return { bg: mixHex(hex, 255, 0.62), fg: mixHex(hex, 0, 0.12) };
}

export function clearMotion(u: number): {
  scale: number;
  lift: number;
  opacity: number;
  glow: number;
} {
  if (u <= 0) return { scale: 1, lift: 0, opacity: 1, glow: 1 };
  const t = Math.min(1, u);
  const k = t * t;
  return {
    scale: 1 - k,
    lift: FEEL.clear.liftEnd * k,
    opacity: 1,
    glow: 1.8 * (1 - k),
  };
}

/** 单颗收缩固定为 flySec；错开压到与 refCount 格同一段总时长。 */
export function synthGatherTimes(pathLen: number, magic: boolean): { flySec: number; stagger: number } {
  const s = FEEL.synth;
  const m = magic ? s.magicMul : 1;
  const flySec = s.flySec * m;
  const ref = Math.max(2, s.refCount);
  const n = Math.max(1, pathLen);
  const extra = Math.max(0, n - ref);
  const total = ((ref - 1) * s.stagger + s.flySec) * m * (1 + extra * 0.055);
  const stagger = n <= 1 ? 0 : Math.max(s.staggerMin, (total - flySec) / (n - 1));
  return { flySec, stagger };
}

/** 路径越长（飞入越密），道具弹出过冲越大。5 格 = 1。 */
export function synthPopAmp(pathLen: number): number {
  const s = FEEL.synth;
  const extra = Math.max(0, pathLen - s.refCount);
  return Math.min(s.popAmpMax, 1 + extra * s.popAmpPer);
}

/** 飞向队尾：加速吸入，缩小并淡出。u 0→1。 */
export function gatherMotion(u: number): {
  k: number;
  scale: number;
  opacity: number;
  glow: number;
} {
  if (u <= 0) return { k: 0, scale: 1, opacity: 1, glow: 1 };
  const t = Math.min(1, u);
  const k = t * t;
  const fade = 1 - k * (1 - FEEL.synth.flyOpacityEnd);
  return {
    k,
    scale: 1 - k,
    opacity: fade,
    glow: 1.8 * (1 - t),
  };
}

/** 金币出场：一条曲线 0.4 → 1.2 → 0.9，上浮同曲线；后段带落地回弹。 */
export function coinAppearMotion(u: number): { opacity: number; scale: number; lift: number } {
  const from = FEEL.convert.coinScaleFrom;
  const peak = FEEL.convert.coinScaleMax;
  const rest = FEEL.convert.coinScale;
  const up = FEEL.convert.coinLift;
  if (u <= 0) return { opacity: 0, scale: from, lift: 0 };
  if (u >= 1) return { opacity: 1, scale: rest, lift: 0 };
  const t = Math.min(1, Math.max(0, u));
  const fadeEnd = Math.max(0.05, FEEL.convert.coinFadeEnd);
  const fadeT = Math.min(1, t / fadeEnd);
  const fade = fadeT * fadeT * (3 - 2 * fadeT);
  const bump = 4 * t * (1 - t);
  const mid = (from + rest) / 2;
  const bounce = Math.sin(Math.PI * 2 * t) * t * t;
  const scale = from + (rest - from) * t + (peak - mid) * bump + 0.06 * bounce;
  const lift = up * bump + up * 0.12 * bounce;
  return { opacity: fade, scale, lift };
}

/** 翻牌缩放：绕图片中心。两端 1，侧棱（u=0.5）最大，避免窄帧看起来缩一圈。 */
export function convertRecolorScale(u: number): number {
  const t = Math.min(1, Math.max(0, u));
  const peak = FEEL.convert.recolorScale;
  return 1 + (peak - 1) * Math.sin(Math.PI * t);
}

/** 弹出缩放 `base` 达到最大的归一化时间（过冲顶点）。与 `itemPopMotion` 同一条三次曲线。 */
export function itemPopPeakU(amp = 1): number {
  const a = Math.max(1, amp);
  const c3 = FEEL.synth.overshoot * a;
  const c1 = c3 + 1;
  return 1 - (2 * c3) / (3 * c1);
}

/** 过冲放大后原地晃：指数衰减，结束时幅度接近 0。 */
export function itemPopMotion(u: number, amp = 1): { scale: number; lift: number; rot: number } {
  const t = Math.min(1, Math.max(0, u));
  const s = FEEL.synth;
  const a = Math.max(1, amp);
  const c3 = s.overshoot * a;
  const c1 = c3 + 1;
  const base = Math.max(0, 1 + c1 * (t - 1) ** 3 + c3 * (t - 1) ** 2);
  const settleU = Math.max(0, (t - 0.3) / 0.7);
  const damp = Math.exp(-4.6 * settleU);
  const osc = Math.sin(settleU * Math.PI * 3.2);
  const scale = Math.max(0, base + s.popIdle * a * osc * damp);
  const rotPunch = s.popSpin * Math.sin(Math.PI * Math.min(1, t / 0.48)) * Math.exp(-6.5 * t);
  const rot = rotPunch + s.popWobble * osc * damp;
  const lift = s.popLift * a * Math.sin(Math.PI * t) + s.popLand * osc * damp;
  return { scale, lift, rot };
}

export const RULES = {
  /** 抬手有效路径最短长度。 */
  pathMin: 2,
  /** 开局色数；顶补随分数解锁到 max。 */
  colorCount: 3,
  colorCountMax: 5,
  /** 第 4、第 5 色解锁累计分（心 / 星）。 */
  colorUnlockAt: [5000, 15000],
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

/** 累计分对应的普通色种数（3→4→5）。 */
export function colorCountForScore(score: number): number {
  let n: number = RULES.colorCount;
  if (score >= RULES.colorUnlockAt[0]!) n = 4;
  if (score >= RULES.colorUnlockAt[1]!) n = 5;
  return Math.min(n, RULES.colorCountMax);
}

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

/** 原点在布局盒左上。旋转/centerScale 绕图片中心；落地挤压绕底边中心；最后 1/dpr。 */
export function pieceLayerTransform(
  x: number,
  y: number,
  scaleX: number,
  scaleY: number,
  pieceW: number,
  pieceH: number,
  dpr: number,
  rotateDeg = 0,
  centerScale = 1,
): string {
  const inv = 1 / clampPieceDpr(dpr);
  const rot = rotateDeg ? `rotate(${rotateDeg}deg) ` : '';
  const mid = centerScale !== 1 ? `scale(${centerScale}) ` : '';
  return `translate3d(${x}px,${y}px,0) translate(${pieceW / 2}px,${pieceH / 2}px) ${rot}${mid}translate(${-pieceW / 2}px,${-pieceH / 2}px) translate(${pieceW / 2}px,${pieceH}px) scale(${scaleX},${scaleY}) translate(${-pieceW / 2}px,${-pieceH}px) scale(${inv})`;
}

import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../adapt/design';
import { cellFromLocal, createFilledBoard, type Cell } from './board';
import {
  clearMotion,
  COLS,
  FEEL,
  gatherMotion,
  itemPopMotion,
  convertPopYawLook,
  magicPopYawLook,
  convertRecolorShown,
  convertRecolorLook,
  convertPieceLook,
  convertBlankLook,
  convertBlankShown,
  isMagicRecolor,
  blankRestLook,
  convertRecolorSec,
  goldSpinLook,
  goldSpinLoopLook,
  pieceLook,

  type LookFrame,
  convertRecolorScale,
  stepColorCount,
  coinAppearMotion,
  CONVERT_RECOLOR_IN,
  CONVERT_RECOLOR_OUT,
  COIN_LOOK,
  FRAME_SLICE,
  HUD,
  PATH_MIN,
  PIECE_ASPECT,

  ROWS,
  STAGE,
  clampPieceDpr,
  isConvertColor,
  isMagicColor,
  pieceDropShadowFilter,
  pieceLayerTransform,
  pieceBadgeStyle,
} from './config';
import {
  beginClear,
  pinCells,
  armSpawnBan,
  CLEAR_SEC,
  stablePathCount,
  createDropSim,
  needsTick,
  stableColors,
  tickDrop,
  type Piece,
} from './drop';
import { disposeClearFx, spawnClearBurst, tickClearFx } from './clearFx';

import { bindSwipeInput } from './input';
import { haptics } from '../utils/haptics';
import { gameSfx } from '../audio/noteSfx';
import {
  extraClearCells,
  resolveStroke,
  type StrokeResolve,
} from './items';
import {
  chebyshev,
  firstMagicCell,
  pieceShouldDim,
  recolorLock,
  recolorWant,
  type RecolorFx,
} from './convertLook';
import { magicClearDelay, pickScoreFlyCells, scoreFlyEase, scoreFlyScale, type ScoreFly } from './scoreFly';
import {
  badgeBoxPx,
  badgeFontPx,
  badgeIsTail,
  badgeKeep,
  badgeLabel,
  badgePlace,
  badgeTailCell,
  badgeTargetPx,
  startBadgeCount,
  stepBadgeCount,
  tickBadgeMotion,
  type BadgeCountJob,
  type BadgeMotion,
} from './pathBadge';
import { createPerfLog, type PerfScene } from './perfLog';
import {
  commitStroke,
  createScoreRoll,
  setScoreTarget,
  strokeCoins,
  strokeScore,
  tickScoreRoll,
} from './score';
import {
  beginPath,
  canCommit,
  cellKey,
  lastStep,
  PATH_TRACE_STEP,
  pointsAlongAimed,
  stepPathCrossing,
  trimPath,
  type PathState,
} from './path';
import {
  computeLayout,
  loadTune,
  saveTune,
  TUNE_DEFAULTS,
  type Tune,
} from './settings';

export function mountBoard(uiRoot: HTMLElement): { dispose: () => void } {
  gameSfx.preload();
  const sim = createDropSim(createFilledBoard());
  let colors = stableColors(sim);
  let tune = loadTune();
  let layout = computeLayout(tune);

  const hudBar = uiRoot.querySelector('#hud') as HTMLElement;
  const hud = uiRoot.querySelector('#hud-score')!;
  const hudCoins = uiRoot.querySelector('#hud-coins')!;
  const hudCoinsWrap = uiRoot.querySelector('#hud-coins-wrap')!;
  const hudCoinIcon = hudCoinsWrap.querySelector('.hud-coins-icon') as HTMLElement;
  const applyHud = () => {
    const panelW = Math.round(HUD.panelSlice * HUD.panelScale);
    const iconH = tune.hudCoinIconH;
    const iconW = Math.round(iconH / PIECE_ASPECT);
    const labelLine = tune.hudLabelSize + 3;
    hudBar.style.setProperty('--hud-panel-slice', String(HUD.panelSlice));
    hudBar.style.setProperty('--hud-panel-width', `${panelW}px`);
    hudBar.style.setProperty('--hud-panel-height', `${tune.hudPanelHeight}px`);
    hudBar.style.setProperty('--hud-gutter', `${tune.hudGutter}px`);
    hudBar.style.setProperty('--hud-label-size', `${tune.hudLabelSize}px`);
    hudBar.style.setProperty('--hud-label-line', `${labelLine}px`);
    hudBar.style.setProperty('--hud-score-size', `${tune.hudScoreSize}px`);
    hudBar.style.setProperty('--hud-score-y', `${tune.hudScoreY}px`);
    hudBar.style.setProperty('--hud-coin-size', `${tune.hudCoinSize}px`);
    hudBar.style.setProperty('--hud-coin-icon-w', `${iconW}px`);
    hudBar.style.setProperty('--hud-coin-icon-h', `${iconH}px`);
    hudBar.style.setProperty('--hud-label-y', `${tune.hudLabelY}px`);
    hudBar.style.setProperty('--hud-coin-icon-x', `${tune.hudCoinIconX}px`);
    hudBar.style.setProperty('--hud-coin-icon-y', `${tune.hudCoinIconY}px`);
    hudBar.style.setProperty('--hud-coin-num-x', `${tune.hudCoinNumX}px`);
    hudBar.style.setProperty('--hud-coin-num-y', `${tune.hudCoinNumY}px`);
    hudBar.style.setProperty('--hud-coin-num-w', `${tune.hudCoinNumW}px`);
    const gap = 4;
    const refNum = Math.round(tune.hudCoinSize * 0.62);
    const inner = tune.hudPanelHeight - 2 * panelW;
    const anchor = Math.round((inner - iconW - gap - refNum) / 2);
    hudBar.style.setProperty('--hud-coin-gap', `${gap}px`);
    hudBar.style.setProperty('--hud-coin-anchor', `${anchor}px`);
    hudBar.style.setProperty('--hud-coin-bar-h', `${HUD.coinBarH}px`);
    hudBar.style.setProperty('--hud-coin-bar-slice', String(HUD.coinBarSlice));
    hudBar.style.setProperty('--hud-coin-bar-y', `${tune.hudCoinBarY}px`);
    requestAnimationFrame(() => fitCoinNum());
  };
  const perf = createPerfLog(uiRoot);
  const scoreRoll = createScoreRoll();
  const coinRoll = createScoreRoll();
  let coins = 0;
  let iconPunchT = -1;
  const fitCoinNum = () => {
    const el = hudCoins as HTMLElement;
    const max = tune.hudCoinSize;
    const min = 10;
    el.style.fontSize = `${max}px`;
    const cap = el.clientWidth;
    if (cap <= 1) return;
    if (el.scrollWidth <= cap) return;
    let lo = min;
    let hi = max;
    let best = min;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      el.style.fontSize = `${mid}px`;
      if (el.scrollWidth <= cap) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    el.style.fontSize = `${best}px`;
  };
  const paintHud = () => {
    hud.textContent = String(scoreRoll.displayed);
    hudCoins.textContent = String(coinRoll.displayed);
    fitCoinNum();
  };
  const aimHud = (target: number) => {
    setScoreTarget(scoreRoll, target);
    paintHud();
    ensureLoop();
  };
  applyHud();
  paintHud();

  const board = document.createElement('div');
  board.id = 'game-board';
  uiRoot.append(board);

  const pad = document.createElement('div');
  pad.className = 'board-pad';
  board.append(pad);

  const cells = document.createElement('div');
  cells.className = 'board-cells';
  board.append(cells);

  const mask = document.createElement('div');
  mask.className = 'board-mask';
  board.append(mask);

  const movers = document.createElement('div');
  movers.className = 'board-movers';
  mask.append(movers);

  const lifts = document.createElement('div');
  lifts.className = 'board-lifts';
  board.append(lifts);

  const fxLayer = document.createElement('div');
  fxLayer.className = 'board-fx';
  board.append(fxLayer);

  const convertCountEl = document.createElement('div');
  convertCountEl.className = 'board-convert-count';
  convertCountEl.hidden = true;
  const convertCountClip = document.createElement('div');
  convertCountClip.className = 'board-convert-clip';
  const convertCountNum = document.createElement('span');
  convertCountNum.className = 'board-convert-num';
  convertCountClip.append(convertCountNum);
  convertCountEl.append(convertCountClip);
  fxLayer.append(convertCountEl);


  const applyLayout = () => {
    applyHud();
    layout = computeLayout(tune);
    const left = (DESIGN_WIDTH - layout.visualWidth) / 2;
    const top = (DESIGN_HEIGHT - layout.visualHeight) / 2 + STAGE.boardOffsetY;

    board.style.left = `${left}px`;
    board.style.top = `${top}px`;
    board.style.width = `${layout.visualWidth}px`;
    board.style.height = `${layout.visualHeight}px`;
    board.style.setProperty('--frame-width', `${layout.frameWidth}px`);
    board.style.setProperty('--frame-slice', String(FRAME_SLICE));
    board.style.setProperty('--cell-w', `${layout.cellW}px`);
    board.style.setProperty('--cell-h', `${layout.cellH}px`);
    board.style.setProperty('--piece-w', `${layout.pieceW}px`);
    board.style.setProperty('--piece-h', `${layout.pieceH}px`);
    board.style.setProperty('--cell-opacity', String(layout.cellOpacity));

    cells.style.left = `${layout.gridLeft}px`;
    cells.style.top = `${layout.gridTop}px`;
    cells.style.width = `${layout.gridWidth}px`;
    cells.style.height = `${layout.gridHeight}px`;
    cells.style.gridTemplateColumns = `repeat(${COLS}, ${layout.cellW}px)`;
    cells.style.gridTemplateRows = `repeat(${ROWS}, ${layout.cellH}px)`;
    cells.style.gap = `${layout.spacing}px`;

    const inset = Math.min(tune.maskInset, Math.floor(layout.visualWidth / 2), Math.floor(layout.visualHeight / 2));
    mask.style.left = `${inset}px`;
    mask.style.top = `${inset}px`;
    mask.style.width = `${layout.visualWidth - inset * 2}px`;
    mask.style.height = `${layout.visualHeight - inset * 2}px`;
    mask.style.setProperty('--mask-radius', `${tune.maskRadius}px`);

    movers.style.left = `${layout.gridLeft - inset}px`;
    movers.style.top = `${layout.gridTop - inset}px`;
    movers.style.width = `${layout.gridWidth}px`;
    movers.style.height = `${layout.gridHeight}px`;

    lifts.style.left = `${layout.gridLeft}px`;
    lifts.style.top = `${layout.gridTop}px`;
    lifts.style.width = `${layout.gridWidth}px`;
    lifts.style.height = `${layout.gridHeight}px`;

    fxLayer.style.left = `${layout.gridLeft}px`;
    fxLayer.style.top = `${layout.gridTop}px`;
    fxLayer.style.width = `${layout.gridWidth}px`;
    fxLayer.style.height = `${layout.gridHeight}px`;


    for (const img of pieceEls.values()) setPieceBitmapSize(img);
    for (const img of glowEls.values()) setPieceBitmapSize(img);
    for (const img of blankGlowEls.values()) setPieceBitmapSize(img);
    for (const img of coinGlowEls.values()) setPieceBitmapSize(img);

    for (const img of coinEls.values()) setPieceBitmapSize(img);
    for (const img of imgPool) setPieceBitmapSize(img);
    for (const img of coinPool) setPieceBitmapSize(img);
    for (const img of blankPool) setPieceBitmapSize(img);
    for (const img of blankEls.values()) setPieceBitmapSize(img);
    for (const img of glowPool) setPieceBitmapSize(img);
    const flyW = layout.pieceW * FEEL.convert.coinScale;
    const flyH = layout.pieceH * FEEL.convert.coinScale;
    for (const img of flyPool) {
      applyLook(img, goldSpinLook(1, false), { w: flyW, h: flyH, filter: false });
    }
    paintPieces();
  };

  const pieceEls = new Map<number, HTMLElement>();
  const glowEls = new Map<number, HTMLElement>();
  const blankGlowEls = new Map<number, HTMLElement>();
  const coinGlowEls = new Map<number, HTMLElement>();
  const coinEls = new Map<number, HTMLElement>();
  const blankEls = new Map<number, HTMLElement>();
  const scoreFlies: ScoreFly[] = [];
  const imgPool: HTMLElement[] = [];
  const coinPool: HTMLElement[] = [];
  const blankPool: HTMLElement[] = [];
  const glowPool: HTMLElement[] = [];
  const flyPool: HTMLElement[] = [];
  const cellEls: HTMLDivElement[][] = [];
  const lastPath: HTMLDivElement[] = [];
  const pathKeys = new Set<string>();
  const pathOrder = new Map<string, number>();
  const pathBadgeEls = new Map<number, HTMLElement>();
  const pathBadgePool: HTMLElement[] = [];
  const badgeMo = new Map<number, BadgeMotion>();
  type BadgePaint = {
    order: number;
    bg: string;
    fg: string;
    font: string;
    op: string;
    z: string;
    tx: string;
    origin: string;
  };
  const badgePaint = new Map<HTMLElement, BadgePaint>();

  const extraKeys = new Set<string>();
  const popT = new Map<number, number>();
  const popV = new Map<number, number>();
  const idleT = new Map<number, number>();
  const popOutFrom = new Map<number, number>();
  const popOutT = new Map<number, number>();
  const dimK = new Map<number, number>();
  const shadowK = new Map<number, number>();
  const extraGlow = new Map<number, number>();
  const dipY = new Map<number, number>();
  const dipV = new Map<number, number>();
  const recolorFx = new Map<number, RecolorFx>();

  const forgetPieceFx = (id: number) => {
    recolorFx.delete(id);
    popT.delete(id);
    popV.delete(id);
    idleT.delete(id);
    popOutFrom.delete(id);
    popOutT.delete(id);
    dimK.delete(id);
    shadowK.delete(id);
    extraGlow.delete(id);
    dipY.delete(id);
    dipV.delete(id);
  };

  for (let row = 0; row < ROWS; row++) {
    const line: HTMLDivElement[] = [];
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement('div');
      cell.className = 'board-cell';
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cells.append(cell);
      line.push(cell);
    }
    cellEls.push(line);
  }

  const parkEl = (el: HTMLElement) => {
    el.style.opacity = '0';
    el.style.zIndex = '';
    el.style.transform = 'translate3d(-9999px,0,0)';
  };

  const makePieceEl = (host: HTMLElement, className: string): HTMLElement => {
    const el = document.createElement('div');
    el.className = className;
    el.setAttribute('role', 'img');
    host.append(el);
    return el;
  };

  const acquireFrom = (pool: HTMLElement[], make: () => HTMLElement): HTMLElement => {
    const el = pool.pop() ?? make();
    el.style.opacity = '';
    return el;
  };

  const acquireImg = (): HTMLElement =>
    acquireFrom(imgPool, () => makePieceEl(movers, 'board-piece'));

  const acquireGlow = (): HTMLElement => {
    const el = acquireFrom(glowPool, () => makePieceEl(lifts, 'board-piece is-additive-glow'));
    el.classList.add('is-additive-glow');
    return el;
  };

  const acquireCoin = (): HTMLElement => {
    const el = acquireFrom(coinPool, () => makePieceEl(lifts, 'board-piece is-coin-overlay'));
    el.classList.add('is-coin-overlay');
    return el;
  };

  const acquireBlank = (): HTMLElement => {
    const el = acquireFrom(blankPool, () => makePieceEl(lifts, 'board-piece is-blank-overlay'));
    el.classList.add('is-blank-overlay');
    return el;
  };

  const makePathBadge = (): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'board-path-badge';
    const box = badgeBoxPx();
    el.style.width = `${box}px`;
    el.style.height = `${box}px`;
    lifts.append(el);
    el.style.opacity = '0';
    return el;
  };

  const acquirePathBadge = (): HTMLElement => acquireFrom(pathBadgePool, makePathBadge);

  const releasePathBadge = (el: HTMLElement, id?: number) => {
    if (el.style.opacity !== '0') el.style.opacity = '0';
    badgePaint.delete(el);
    pathBadgePool.push(el);
    if (id != null) badgeMo.delete(id);
  };

  for (let i = 0; i < ROWS * COLS; i++) pathBadgePool.push(makePathBadge());

  const acquireFly = (): HTMLElement =>
    acquireFrom(flyPool, () => {
      const el = document.createElement('div');
      el.className = 'score-fly-coin';
      uiRoot.append(el);
      return el;
    });

  const releaseImg = (el: HTMLElement) => {
    el.classList.remove('is-dim', 'is-clearing', 'is-convert', 'is-magic', 'is-lifted');
    parkEl(el);
    imgPool.push(el);
  };

  const releaseGlow = (el: HTMLElement) => {
    parkEl(el);
    glowPool.push(el);
  };

  const releaseCoin = (el: HTMLElement) => {
    el.style.filter = 'none';
    el.style.opacity = '0';
    el.style.zIndex = '2';
    coinPool.push(el);
  };

  const releaseBlank = (el: HTMLElement) => {
    el.style.filter = 'none';
    el.style.opacity = '0';
    el.style.zIndex = '2';
    blankPool.push(el);
  };

  const releaseFly = (el: HTMLElement) => {
    parkEl(el);
    flyPool.push(el);
  };

  const pieceDpr = () => clampPieceDpr(window.devicePixelRatio || 1);

  const applyLook = (
    el: HTMLElement,
    look: LookFrame,
    box?: { w?: number; h?: number; filter?: boolean },
  ) => {
    const dpr = pieceDpr();
    const w = box?.w ?? layout.pieceW * dpr;
    const h = box?.h ?? layout.pieceH * dpr;
    const frame = `${look.i}:${look.n}:${w}:${h}`;
    if (el.dataset.sheet !== look.src) {
      el.dataset.sheet = look.src;
      el.style.backgroundImage = look.src ? `url("${look.src}")` : '';
    }
    if (el.dataset.bw !== String(w)) {
      el.dataset.bw = String(w);
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
    }
    if (box?.filter !== false) {
      const filter = pieceDropShadowFilter(dpr);
      if (el.style.filter !== filter) el.style.filter = filter;
    }
    if (el.dataset.frame !== frame) {
      el.dataset.n = String(look.n);
      el.dataset.i = String(look.i);
      el.dataset.frame = frame;
      el.style.backgroundSize = `${look.n * w}px ${h}px`;
      el.style.backgroundPosition = `${-look.i * w}px 0`;
    }
  };

  const setPieceBitmapSize = (el: HTMLElement) => {
    const src = el.dataset.sheet || '';
    const n = Number(el.dataset.n || 1);
    const i = Number(el.dataset.i || 0);
    applyLook(el, { src, i, n });
  };

  const pieceLeft = (col: number) =>
    col * (layout.cellW + layout.spacing) + (layout.cellW - layout.pieceW) / 2;
  const pieceTop = (y: number) =>
    y * (layout.cellH + layout.spacing) + (layout.cellH - layout.pieceH) / 2;

  const warmCount = ROWS * COLS;
  const placeIdle = (el: HTMLElement, row: number, col: number) => {
    const x = pieceLeft(col);
    const y = pieceTop(row);
    el.style.opacity = '0';
    el.style.filter = 'none';
    el.style.zIndex = '2';
    el.style.transform = pieceLayerTransform(
      x,
      y,
      1,
      1,
      layout.pieceW,
      layout.pieceH,
      pieceDpr(),
    );
  };
  for (let i = 0; i < warmCount; i++) {
    const el = makePieceEl(lifts, 'board-piece is-coin-overlay');
    applyLook(el, goldSpinLook(1, false));
    placeIdle(el, Math.floor(i / COLS), i % COLS);
    coinPool.push(el);
  }
  for (let i = 0; i < warmCount; i++) {
    const el = makePieceEl(lifts, 'board-piece is-blank-overlay');
    applyLook(el, blankRestLook());
    placeIdle(el, Math.floor(i / COLS), i % COLS);
    blankPool.push(el);
  }
  for (let i = 0; i < warmCount * 2; i++) {
    const el = makePieceEl(lifts, 'board-piece is-additive-glow');
    applyLook(el, pieceLook(0));
    parkEl(el);
    glowPool.push(el);
  }
  for (let i = 0; i < warmCount; i++) {
    const el = document.createElement('div');
    el.className = 'score-fly-coin';
    applyLook(el, goldSpinLook(1, false), {
      w: layout.pieceW * FEEL.convert.coinScale,
      h: layout.pieceH * FEEL.convert.coinScale,
      filter: false,
    });
    uiRoot.append(el);
    parkEl(el);
    flyPool.push(el);
  }
  for (let i = 0; i < 12; i++) {
    const el = makePieceEl(movers, 'board-piece');
    applyLook(el, pieceLook(0));
    parkEl(el);
    imgPool.push(el);
  }

  const syncPieceEl = (piece: Piece): HTMLElement => {
    let el = pieceEls.get(piece.id);
    if (!el) {
      el = acquireImg();
      pieceEls.set(piece.id, el);
    }
    const rec = recolorFx.get(piece.id);
    const recU = rec ? rec.t / convertRecolorSec(rec.from, rec.to) : 1;
    const shown =
      piece.state === 'clearing' && piece.clearLook >= 0
        ? piece.clearLook
        : rec
          ? convertRecolorShown(rec.from, rec.to, recU)
          : piece.color;
    const poppingIn = piece.itemPopSec > 0 && piece.itemPopT < piece.itemPopSec;
    const popU = piece.itemPopSec > 0 ? piece.itemPopT / piece.itemPopSec : 1;
    const popIn =
      piece.itemPopSec > 0 ? itemPopMotion(popU, piece.itemPopAmp) : null;
    const magicRec = rec && isMagicRecolor(rec.from, rec.to);
    const recLook = rec
      ? magicRec
        ? convertPieceLook(rec.from, rec.to, recU)
        : convertRecolorLook(rec.from, rec.to, recU)
      : null;
    const yawLook = poppingIn
      ? isMagicColor(piece.color)
        ? magicPopYawLook(popU, piece.itemPopAmp)
        : isConvertColor(piece.color)
          ? convertPopYawLook(popU, piece.itemPopAmp)
          : null
      : null;
    const look =
      yawLook ?? recLook ?? pieceLook(shown === COIN_LOOK ? piece.color : shown);
    const dimAmt = dimK.get(piece.id) ?? 0;
    const magicFace =
      shown === COIN_LOOK || (piece.state === 'clearing' && piece.clearLook === COIN_LOOK);
    const flipping = !!rec && recU > 0 && recU < 1;
    const hideBase = magicFace;
    const gather = piece.state === 'clearing' && piece.flySec > 0;
    const clearDur = gather ? piece.flySec : CLEAR_SEC;
    const clearU = piece.state === 'clearing' ? piece.clearT / clearDur : -1;
    const fly = gather ? gatherMotion(clearU) : null;
    const clear = piece.state === 'clearing' && !gather ? clearMotion(clearU) : null;
    const fade = fly ? fly.opacity : clear ? clear.opacity : 1;
    const fromX = pieceLeft(piece.col);
    const fromY = pieceTop(piece.visualY) + piece.offsetY;
    const toX = piece.gatherCol != null ? pieceLeft(piece.gatherCol) : fromX;
    const toY = piece.gatherCol != null ? pieceTop(piece.gatherY) : fromY;
    const k = fly ? fly.k : 0;
    const x = fromX + (toX - fromX) * k;
    const y = fromY + (toY - fromY) * k;
    const opacity = fade * (1 - dimAmt * (1 - FEEL.select.otherOpacity));
    const popK = popT.get(piece.id) ?? 0;
    const pieceRowEarly = piece.destRow ?? piece.sourceRow;
    const convertSel =
      !!pendingConvert && extraKeys.has(`${pieceRowEarly},${piece.col}`) && !pathKeys.has(`${pieceRowEarly},${piece.col}`);
    const selScale = convertSel ? FEEL.convert.scale : FEEL.select.scale;
    const selLift = convertSel ? FEEL.convert.lift : FEEL.select.lift;
    const popS = 1 + (selScale - 1) * popK;
    const idle = idleT.get(piece.id) ?? 0;
    const vel = popV.get(piece.id) ?? 0;
    const settle = Math.max(0, 1 - (Math.abs(popK - 1) + Math.abs(vel) * 0.06) / 0.32);
    const bob =
      piece.state === 'clearing' || poppingIn || flipping
        ? 0
        : FEEL.select.idleLift * settle * Math.sin(idle * FEEL.select.idleHz * Math.PI * 2 + piece.id * 0.9);
    const clearS = fly ? fly.scale : clear ? clear.scale : 1;
    const clearLift = clear ? clear.lift : 0;
    const wobble =
      piece.state === 'clearing' || popOutT.has(piece.id)
        ? 0
        : vel * (convertSel ? FEEL.convert.wobble : FEEL.select.wobble) * (piece.id % 2 === 0 ? 1 : -1);
    const dip = dipY.get(piece.id) ?? 0;
    const popLift = popIn?.lift ?? 0;
    const popRot = popIn?.rot ?? 0;
    const popScale = popIn?.scale ?? 1;
    const recPulse = rec && recU < 1 ? convertRecolorScale(recU) : 1;
    const liftY = selLift * Math.max(0, popK) + bob + clearLift + popLift - dip;
    const xf = pieceLayerTransform(
      x,
      y - liftY,
      piece.scaleX * popS * clearS * popScale,
      piece.scaleY * popS * clearS * popScale,
      layout.pieceW,
      layout.pieceH,
      pieceDpr(),
      wobble + popRot,
      recPulse,
    );
    if (!hideBase) {
      const shadowAmt = shadowK.get(piece.id) ?? 1;
      applyLook(el, look, flipping || shadowAmt < 0.98 ? { filter: false } : undefined);
      if (flipping || shadowAmt < 0.02) {
        if (el.style.filter !== 'none') el.style.filter = 'none';
      } else if (shadowAmt < 0.98) {
        const f = pieceDropShadowFilter(pieceDpr(), shadowAmt);
        if (el.style.filter !== f) el.style.filter = f;
      }
      if (el.dataset.color !== String(shown)) el.dataset.color = String(shown);
      const op = opacity === 1 ? '' : String(opacity);
      if (el.style.opacity !== op) el.style.opacity = op;
      if (el.style.transform !== xf) el.style.transform = xf;
      el.classList.toggle('is-clearing', piece.state === 'clearing');
      el.classList.toggle('is-convert', isConvertColor(piece.color) && !isMagicColor(shown));
      el.classList.toggle('is-magic', isMagicColor(shown) || shown === COIN_LOOK);
      el.classList.toggle('is-dim', dimAmt > 0.02);
      el.classList.toggle('is-lifted', popK > 0);
      const zBase = gather
        ? 240 + Math.round((1 - k) * 20)
        : piece.state === 'clearing'
          ? 180
          : Math.round(piece.visualY * 20 + popK * 6 + (poppingIn ? 16 : 0));
      const zStr = String(10 + zBase);
      if (el.style.zIndex !== zStr) el.style.zIndex = zStr;
      const host0 = piece.visualY < -0.02 && !gather && !poppingIn ? movers : lifts;
      if (el.parentElement !== host0) host0.append(el);
    } else {
      if (el.style.opacity !== '0') el.style.opacity = '0';
      el.classList.remove('is-lifted');
    }
    const z = gather
      ? 240 + Math.round((1 - k) * 20)
      : piece.state === 'clearing'
        ? 180
        : Math.round(piece.visualY * 20 + popK * 6 + (poppingIn ? 16 : 0));
    const host = piece.visualY < -0.02 && !gather && !poppingIn ? movers : lifts;

    const pieceRow = piece.destRow ?? piece.sourceRow;
    const onPath = pathKeys.has(`${pieceRow},${piece.col}`);
    const markG = extraGlow.get(piece.id) ?? 0;
    const glowAmt = fly ? fly.glow : clear ? clear.glow : onPath ? popK : markG;

    const coinDelay = FEEL.convert.coinDelaySec;
    const goingBlank = !!rec && rec.to === COIN_LOOK;
    const leavingBlank = !!rec && rec.from === COIN_LOOK && rec.to !== COIN_LOOK;
    const goldU = rec
      ? goingBlank
        ? (rec.t - coinDelay) / FEEL.convert.coinSpinSec
        : leavingBlank
          ? rec.t / convertRecolorSec(rec.from, rec.to)
          : 1
      : 1;
    const flipOutU =
      CONVERT_RECOLOR_OUT / Math.max(1, CONVERT_RECOLOR_OUT + CONVERT_RECOLOR_IN);
    const coinDue = !rec || rec.t >= coinDelay;
    const coinFade =
      leavingBlank ? 1 - Math.min(1, Math.max(0, goldU) / flipOutU) : 1;
    const flyLaunched =
      scoreFlies.length > 0 &&
      scoreFlies.some((f) => f.pieceId === piece.id && f.t >= f.delay);
    const wantCoin =
      !flyLaunched &&
      ((leavingBlank && coinFade > 0.02) || ((goingBlank || shown === COIN_LOOK) && coinDue));
    const coinLive = wantCoin && fade > 0.08;
    const wantBlank =
      fade > 0.08 &&
      ((magicRec && rec && convertBlankShown(rec.from, rec.to, recU)) || magicFace);
    if (wantBlank) {
      let blank = blankEls.get(piece.id);
      if (!blank) {
        blank = acquireBlank();
        blankEls.set(piece.id, blank);
      }
      applyLook(blank, rec && magicRec ? convertBlankLook(rec.from, rec.to, recU) : blankRestLook());
      if (blank.style.transform !== xf) blank.style.transform = xf;
      const blankOp = opacity === 1 ? '1' : String(opacity);
      if (blank.style.opacity !== blankOp) blank.style.opacity = blankOp;
      const blankZ = String(12 + z);
      if (blank.style.zIndex !== blankZ) blank.style.zIndex = blankZ;
      if (blank.parentElement !== host) host.append(blank);
    } else {
      const blank = blankEls.get(piece.id);
      if (blank && blank.style.opacity !== '0') blank.style.opacity = '0';
    }
    const coinLook =
      rec && goldU < 1 && goldU >= 0 ? goldSpinLook(goldU, leavingBlank) : goldSpinLook(1, false);
    let coinXf = xf;
    if (coinLive) {
      let coin = coinEls.get(piece.id);
      if (!coin) {
        coin = acquireCoin();
        coinEls.set(piece.id, coin);
      }
      applyLook(coin, coinLook);
      const appearU = Math.min(1, Math.max(0, goldU));
      const appear = leavingBlank
        ? { opacity: coinFade, scale: 1, lift: 0 }
        : coinAppearMotion(appearU);
      coinXf = pieceLayerTransform(
        x,
        y - liftY - appear.lift,
        piece.scaleX * popS * clearS * popScale,
        piece.scaleY * popS * clearS * popScale,
        layout.pieceW,
        layout.pieceH,
        pieceDpr(),
        wobble + popRot,
        recPulse * appear.scale,
      );
      if (coin.style.transform !== coinXf) coin.style.transform = coinXf;
      const coinOp = opacity * appear.opacity === 1 ? '1' : String(opacity * appear.opacity);
      if (coin.style.opacity !== coinOp) coin.style.opacity = coinOp;
      const coinZ = String(13 + z);
      if (coin.style.zIndex !== coinZ) coin.style.zIndex = coinZ;
      if (coin.parentElement !== host) host.append(coin);
    } else {
      const coin = coinEls.get(piece.id);
      if (coin && coin.style.opacity !== '0') coin.style.opacity = '0';
    }

    const wantGlow = fade > 0.08 && glowAmt > 0.02;
    const pathGlowOp = onPath ? FEEL.select.glowOpacity : FEEL.convert.markGlow;
    const paintGlow = (
      map: Map<number, HTMLElement>,
      glowLook: LookFrame,
      xf: string,
      zi: number,
      op: number,
    ) => {
      let glow = map.get(piece.id);
      if (!glow) {
        glow = acquireGlow();
        map.set(piece.id, glow);
      }
      applyLook(glow, glowLook);
      glow.classList.add('is-on');
      glow.dataset.color = String(shown);
      glow.style.opacity = String(op * fade * glowAmt);
      glow.style.transform = xf;
      glow.style.zIndex = String(zi);
      if (glow.parentElement !== host) host.append(glow);
    };
    const dropGlow = (map: Map<number, HTMLElement>) => {
      const glow = map.get(piece.id);
      if (!glow) return;
      glow.classList.remove('is-on');
      releaseGlow(glow);
      map.delete(piece.id);
    };
    dropGlow(blankGlowEls);
    if (wantGlow && !coinLive) {
      paintGlow(glowEls, look, el.style.transform, 11 + z, pathGlowOp);
    } else {
      dropGlow(glowEls);
    }
    if (wantGlow && coinLive) {
      paintGlow(coinGlowEls, coinLook, coinXf, 14 + z, FEEL.select.glowOpacity);
    } else {
      dropGlow(coinGlowEls);
    }
    const order = pathOrder.get(`${pieceRow},${piece.col}`);
    const tail = badgeTailCell(pendingConvert ? pendingConvert.countdown.cells : path?.cells);
    const isNow = badgeIsTail(pieceRow, piece.col, tail);
    const keepCount = badgeKeep(pendingConvert?.countdown ?? null, order, isNow, onPath);
    const label = badgeLabel(pendingConvert?.countdown ?? null, order, isNow);
    let badge = pathBadgeEls.get(piece.id);
    if (!badge) {
      badge = acquirePathBadge();
      pathBadgeEls.set(piece.id, badge);
    }
    const curSize = badgeMo.get(piece.id)?.x ?? 0;
    const showBadge = fade > 0.08 && (keepCount || curSize > 1.2) && (onPath || !!pendingConvert);
    if (showBadge) {
      const bs = badgeMo.get(piece.id)?.x ?? (keepCount ? FEEL.select.badge.size : 0);
      if (!keepCount && bs < 1.2) {
        if (badge.style.opacity !== '0') badge.style.opacity = '0';
        const prev = badgePaint.get(badge);
        if (prev) prev.op = '0';
      } else {
        const swipeColor = path?.magic
          ? 6
          : path && path.color >= 0
            ? path.color
            : shown === COIN_LOOK
              ? 6
              : shown >= 0
                ? shown
                : piece.color;
        const tint = pieceBadgeStyle(swipeColor);
        const box = badgeBoxPx();
        const placed = badgePlace(x, y, liftY, layout.pieceW, box, bs, isNow);
        const op = String(FEEL.select.badge.opacity * (keepCount ? 1 : Math.min(1, bs / FEEL.select.badge.size)));
        const zStr = String(20 + z);
        const font = badgeFontPx(label, isNow);
        const prev = badgePaint.get(badge);
        if (!prev || prev.order !== label) badge.textContent = String(label);
        if (!prev || prev.bg !== tint.bg) badge.style.background = tint.bg;
        if (!prev || prev.fg !== tint.fg) badge.style.color = tint.fg;
        if (!prev || prev.font !== font) badge.style.fontSize = font;
        if (!prev || prev.op !== op) badge.style.opacity = op;
        if (!prev || prev.z !== zStr) badge.style.zIndex = zStr;
        if (!prev || prev.origin !== placed.origin) badge.style.transformOrigin = placed.origin;
        if (!prev || prev.tx !== placed.tx) badge.style.transform = placed.tx;
        badgePaint.set(badge, {
          order: label,
          bg: tint.bg,
          fg: tint.fg,
          font,
          op,
          z: zStr,
          tx: placed.tx,
          origin: placed.origin,
        });
        if (badge.parentElement !== lifts) lifts.append(badge);
      }
    } else if (badge.style.opacity !== '0') {
      badge.style.opacity = '0';
      const prev = badgePaint.get(badge);
      if (prev) prev.op = '0';
    }
    return el;
  };

  const recolorVisualOf = (piece: Piece): number => {
    const rec = recolorFx.get(piece.id);
    if (!rec) return piece.color;
    return convertRecolorShown(rec.from, rec.to, rec.t / convertRecolorSec(rec.from, rec.to));
  };

  let magicOrigin: { row: number; col: number } | null = null;

  const retargetRecolor = (piece: Piece, want: number, delaySec: number) => {
    const rec = recolorFx.get(piece.id);
    if (rec && !rec.done && rec.to === want) return;
    const vis = recolorVisualOf(piece);
    if (vis === want) {
      if (want === piece.color) recolorFx.delete(piece.id);
      else if (!rec || rec.to !== want || !rec.done) {
        recolorFx.set(piece.id, {
          from: want,
          to: want,
          t: convertRecolorSec(want, want),
          done: true,
        });
      }
      return;
    }
    recolorFx.set(piece.id, { from: vis, to: want, t: -Math.max(0, delaySec), done: false });
  };

  /** 滑动中：锁色变则播翻面；回退反向。提交消除时不要走这里，用 snap 掉。 */
  const syncRecolor = (next: PathState | null) => {
    const magicLook = !!next?.magic;
    if (next?.magic) {
      const at = firstMagicCell(next, colors);
      if (at) magicOrigin = at;
    }
    const lock = recolorLock(next, colors);
    const onPath = new Set<string>();
    if (lock >= 0 && next) {
      for (const cell of next.cells) onPath.add(`${cell.row},${cell.col}`);
    }
    const step = FEEL.convert.rippleStepSec;
    for (const piece of sim.pieces.values()) {
      if (piece.state === 'clearing') continue;
      const row = piece.destRow ?? piece.sourceRow;
      const want = recolorWant(piece, lock, onPath.has(`${row},${piece.col}`), magicLook);
      const delay =
        want === COIN_LOOK && magicOrigin
          ? chebyshev({ row, col: piece.col }, magicOrigin) * step
          : 0;
      retargetRecolor(piece, want, delay);
    }
    for (const id of [...recolorFx.keys()]) {
      if (!sim.pieces.has(id)) recolorFx.delete(id);
    }
    if (!magicLook) {
      let hold = false;
      for (const rec of recolorFx.values()) {
        if (rec.from === COIN_LOOK || rec.to === COIN_LOOK) {
          hold = true;
          break;
        }
      }
      if (!hold) magicOrigin = null;
    }
  };

  const snapRecolorOff = (cells: Cell[] = []) => {
    if (!cells.length) {
      recolorFx.clear();
      return;
    }
    const keys = new Set(cells.map((c) => `${c.row},${c.col}`));
    for (const piece of sim.pieces.values()) {
      const row = piece.destRow ?? piece.sourceRow;
      if (keys.has(`${row},${piece.col}`)) recolorFx.delete(piece.id);
    }
  };

  const tickRecolor = (dt: number): boolean => {
    let any = false;
    const secFor = (rec: RecolorFx) => convertRecolorSec(rec.from, rec.to);
    for (const [id, rec] of recolorFx) {
      if (!sim.pieces.has(id)) {
        recolorFx.delete(id);
        continue;
      }
      rec.t += dt;
      const sec = secFor(rec);
      if (!rec.done && rec.t >= sec) rec.done = true;
      const spinEnd =
        rec.to === COIN_LOOK ? FEEL.convert.coinDelaySec + FEEL.convert.coinSpinSec : sec;
      if (rec.done && rec.t >= spinEnd) {
        const piece = sim.pieces.get(id);
        if (piece && rec.to === piece.color) recolorFx.delete(id);
      }
      if (!rec.done || rec.t < spinEnd) any = true;
    }
    return any;
  };

  const paintPieces = () => {
    for (const piece of sim.pieces.values()) syncPieceEl(piece);
    for (const [id, el] of pieceEls) {
      if (sim.pieces.has(id)) continue;
      forgetPieceFx(id);
      releaseImg(el);
      pieceEls.delete(id);
    }
    for (const [id, el] of glowEls) {
      if (sim.pieces.has(id) && pathKeys.size) continue;
      el.classList.remove('is-on');
      releaseGlow(el);
      glowEls.delete(id);
    }
    for (const [id, el] of blankGlowEls) {
      if (sim.pieces.has(id) && pathKeys.size) continue;
      el.classList.remove('is-on');
      releaseGlow(el);
      blankGlowEls.delete(id);
    }
    for (const [id, el] of coinGlowEls) {
      if (sim.pieces.has(id) && pathKeys.size) continue;
      el.classList.remove('is-on');
      releaseGlow(el);
      coinGlowEls.delete(id);
    }

    for (const [id, el] of coinEls) {
      if (sim.pieces.has(id)) continue;
      releaseCoin(el);
      coinEls.delete(id);
    }
    for (const [id, el] of blankEls) {
      if (sim.pieces.has(id)) continue;
      releaseBlank(el);
      blankEls.delete(id);
    }
    for (const [id, el] of pathBadgeEls) {
      if (sim.pieces.has(id)) continue;
      releasePathBadge(el, id);
      pathBadgeEls.delete(id);
    }
  };

  const paintDirtyPieces = () => {
    const ids = new Set<number>();
    for (const id of popT.keys()) ids.add(id);
    for (const id of dipY.keys()) ids.add(id);
    for (const id of extraGlow.keys()) ids.add(id);
    for (const id of dimK.keys()) ids.add(id);
    for (const id of shadowK.keys()) ids.add(id);
    for (const id of badgeMo.keys()) ids.add(id);
    for (const id of glowEls.keys()) ids.add(id);
    for (const id of coinGlowEls.keys()) ids.add(id);
    for (const piece of sim.pieces.values()) {
      if (piece.state === 'clearing') continue;
      const key = `${piece.destRow ?? piece.sourceRow},${piece.col}`;
      if (pathKeys.has(key) || extraKeys.has(key)) ids.add(piece.id);
    }
    for (const [id, rec] of recolorFx) {
      if (rec.t < 0) continue;
      const spinEnd =
        rec.to === COIN_LOOK || rec.from === COIN_LOOK
          ? Math.max(convertRecolorSec(rec.from, rec.to), FEEL.convert.coinDelaySec + FEEL.convert.coinSpinSec)
          : convertRecolorSec(rec.from, rec.to);
      if (!rec.done || rec.t < spinEnd) ids.add(id);
    }
    for (const id of ids) {
      const piece = sim.pieces.get(id);
      if (piece) syncPieceEl(piece);
    }
  };

  let path: PathState | null = null;
  let magicSfxArmed = false;
  let lastLocal: { x: number; y: number } | null = null;
  let lastDipHover: string | null = null;
  let convertPreview: Cell[] = [];
  let pendingConvert: {
    countdown: BadgeCountJob;
    settle: StrokeResolve;
    queue: Cell[];
    loc: { x: number; y: number };
    holding: boolean;
    holdAcc: number;
    holdAfter: boolean;
    lockColor: number;
    payout: number;
  } | null = null;
  applyLayout();
  for (const piece of sim.pieces.values()) {
    const row = piece.destRow ?? piece.sourceRow;
    if (!blankEls.has(piece.id)) {
      const b = acquireBlank();
      blankEls.set(piece.id, b);
      placeIdle(b, row, piece.col);
    }
    if (!coinEls.has(piece.id)) {
      const c = acquireCoin();
      coinEls.set(piece.id, c);
      placeIdle(c, row, piece.col);
    }
    if (!pathBadgeEls.has(piece.id)) pathBadgeEls.set(piece.id, acquirePathBadge());
  }

  let convertCountOn = false;
  const paintConvertCount = (n: number, loc: { x: number; y: number } | null) => {
    if (n > 0 && loc) {
      convertCountNum.textContent = String(n);
      convertCountEl.style.left = `${loc.x}px`;
      convertCountEl.style.top = `${loc.y - FEEL.convert.countLift}px`;
      convertCountEl.hidden = false;
      if (!convertCountOn) {
        convertCountOn = true;
        convertCountEl.classList.remove('is-out');
        convertCountEl.classList.add('is-in');
      }
      return;
    }
    if (!convertCountOn) {
      convertCountEl.hidden = true;
      return;
    }
    convertCountOn = false;
    convertCountEl.classList.remove('is-in');
    convertCountEl.classList.add('is-out');
  };
  convertCountEl.addEventListener('transitionend', (ev) => {
    if (ev.propertyName !== 'opacity' || convertCountOn) return;
    convertCountEl.hidden = true;
  });

  let raf = 0;
  let lastTs = 0;

  const gridLocal = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const rect = cells.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const sx = rect.width / layout.gridWidth;
    const sy = rect.height / layout.gridHeight;
    if (sx <= 0 || sy <= 0) return null;
    return {
      x: (clientX - rect.left) / sx,
      y: (clientY - rect.top) / sy,
    };
  };

  const paintPath = (next: PathState | null, ok: boolean) => {
    for (let i = 0; i < lastPath.length; i++) {
      lastPath[i]!.classList.remove('is-path', 'is-path-tail', 'is-path-ok', 'is-hit');
    }
    lastPath.length = 0;
    pathKeys.clear();
    pathOrder.clear();
    extraKeys.clear();
    const magicLook = !!next?.magic;
    if (board.classList.contains('is-magic-look') !== magicLook) {
      board.classList.toggle('is-magic-look', magicLook);
    }
    if (next) {
      next.cells.forEach((cell, i) => {
        pathKeys.add(`${cell.row},${cell.col}`);
        pathOrder.set(`${cell.row},${cell.col}`, i + 1);
        const el = cellEls[cell.row]?.[cell.col];
        if (!el) return;
        el.classList.add('is-path');
        if (ok) el.classList.add('is-path-ok');
        if (i === next.cells.length - 1) el.classList.add('is-path-tail');
        lastPath.push(el);
      });
      convertPreview = extraClearCells(next, colors, convertPreview);
      for (const cell of convertPreview) extraKeys.add(`${cell.row},${cell.col}`);
    } else {
      convertPreview = [];
    }
    syncRecolor(next);
    paintConvertCount(0, null);
    if (!next) paintPieces();
    else paintDirtyPieces();
    ensureLoop();
  };

  const pickConvertExtra = (cell: Cell) => {
    extraKeys.add(`${cell.row},${cell.col}`);
    fireHaptic('mark');
  };

  const lookColorNow = (piece: Piece): number => {
    if (board.classList.contains('is-magic-look')) return COIN_LOOK;
    const rec = recolorFx.get(piece.id);
    if (rec) return convertRecolorShown(rec.from, rec.to, rec.t / convertRecolorSec(rec.from, rec.to));
    return piece.color;
  };

  const stampClearLook = (cells: Cell[]) => {
    const seen = new Set<string>();
    for (const cell of cells) {
      const k = `${cell.row},${cell.col}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const p = sim.slots[cell.row]![cell.col]!.current;
      if (p && p.state === 'stable') p.clearLook = lookColorNow(p);
    }
  };

  const scoreTargetInUi = (): { x: number; y: number; w: number; h: number } => {
    const uiRect = uiRoot.getBoundingClientRect();
    const dest = hudCoinIcon.getBoundingClientRect();
    const sx = uiRect.width > 0 ? DESIGN_WIDTH / uiRect.width : 1;
    const sy = uiRect.height > 0 ? DESIGN_HEIGHT / uiRect.height : 1;
    return {
      x: (dest.left + dest.width / 2 - uiRect.left) * sx,
      y: (dest.top + dest.height / 2 - uiRect.top) * sy,
      w: dest.width * sx,
      h: dest.height * sy,
    };
  };

  const spawnScoreFlies = (cells: Cell[]) => {
    const before = scoreFlies.length;
    const dest = scoreTargetInUi();
    const boardLeft = Number.parseFloat(board.style.left || '0') || 0;
    const boardTop = Number.parseFloat(board.style.top || '0') || 0;
    const w = layout.pieceW * FEEL.convert.coinScale;
    const h = layout.pieceH * FEEL.convert.coinScale;
    const endScale =
      w > 0 && dest.w > 0
        ? (dest.w / w) * FEEL.convert.scoreFlyEndMul
        : FEEL.convert.scoreFlyEndScale;
    const picked = pickScoreFlyCells(cells);
    const delayOf = magicClearDelay(picked);
    const credits: number[] = [];
    const toShow = Math.max(0, coins - coinRoll.target);
    const m = picked.length;
    const base = m > 0 ? Math.floor(toShow / m) : 0;
    let rem = m > 0 ? toShow - base * m : 0;
    for (let i = 0; i < m; i++) {
      credits.push(base + (rem > 0 ? 1 : 0));
      if (rem > 0) rem -= 1;
    }
    picked.forEach((cell, i) => {
      const p = sim.slots[cell.row]![cell.col]!.current;
      if (!p || p.state !== 'stable') return;
      const el = acquireFly();
      applyLook(el, goldSpinLook(1, false), { w, h, filter: false });
      scoreFlies.push({
        el,
        pieceId: p.id,
        x0: boardLeft + layout.gridLeft + pieceLeft(p.col) + layout.pieceW / 2,
        y0: boardTop + layout.gridTop + pieceTop(p.visualY) + layout.pieceH / 2,
        x1: dest.x,
        y1: dest.y,
        t: 0,
        sec: FEEL.convert.scoreFlySec,
        delay: delayOf(cell),
        w,
        h,
        endScale,
        hit: false,
        fade: 0,
        credit: credits[i] ?? 1,
      });
    });
    if (scoreFlies.length === before) setScoreTarget(coinRoll, coins);
  };

  const punchCoinIcon = () => {
    iconPunchT = 0;
    hudBar.style.setProperty('--hud-coin-icon-punch', String(FEEL.convert.coinIconPunch));
  };

  const onCoinLand = (credit: number) => {
    setScoreTarget(coinRoll, Math.min(coins, coinRoll.target + Math.max(1, credit)));
    punchCoinIcon();
    paintHud();
    ensureLoop();
  };

  const tickIconPunch = (dt: number): boolean => {
    if (iconPunchT < 0) return false;
    iconPunchT += dt;
    const sec = FEEL.convert.coinIconPunchSec;
    const u = Math.min(1, iconPunchT / sec);
    const peak = FEEL.convert.coinIconPunch;
    const rest = 1 - u;
    const s = 1 + (peak - 1) * rest * rest;
    hudBar.style.setProperty('--hud-coin-icon-punch', String(s));
    if (u >= 1) {
      iconPunchT = -1;
      hudBar.style.setProperty('--hud-coin-icon-punch', '1');
      return false;
    }
    return true;
  };

  const tickScoreFlies = (dt: number): boolean => {
    if (!scoreFlies.length && iconPunchT < 0) return false;
    const arc = FEEL.convert.scoreFlyArc;
    const spin = FEEL.convert.coinSpinSec;
    const fadeStart = FEEL.convert.scoreFlyFadeStart;
    for (let i = scoreFlies.length - 1; i >= 0; i--) {
      const fly = scoreFlies[i]!;
      fly.t += dt;
      const local = fly.t - fly.delay;
      if (local < 0) {
        fly.el.style.opacity = '0';
        continue;
      }
      const u = Math.min(1, local / fly.sec);
      applyLook(fly.el, goldSpinLoopLook(local / spin), {
        w: fly.w,
        h: fly.h,
        filter: false,
      });
      const k = scoreFlyEase(u);
      const x = fly.x0 + (fly.x1 - fly.x0) * k;
      const y = fly.y0 + (fly.y1 - fly.y0) * k - Math.sin(Math.PI * u) * arc;
      const s = scoreFlyScale(u, fly.endScale);
      fly.el.style.transform = `translate3d(${x - fly.w / 2}px,${y - fly.h / 2}px,0) scale(${s})`;
      fly.el.style.transformOrigin = 'center center';
      const span = Math.max(0.08, 1 - fadeStart);
      const fu = u <= fadeStart ? 0 : Math.min(1, (u - fadeStart) / span);
      const op = (1 - fu) * (1 - fu);
      fly.el.style.opacity = op > 0.03 ? String(op) : '0';
      if (u >= 1) {
        if (!fly.hit) {
          fly.hit = true;
          onCoinLand(fly.credit);
        }
        releaseFly(fly.el);
        scoreFlies.splice(i, 1);
        if (!scoreFlies.length && coinRoll.target !== coins) {
          setScoreTarget(coinRoll, coins);
          paintHud();
        }
      }
    }
    const punching = tickIconPunch(dt);
    return scoreFlies.length > 0 || punching;
  };

  const commitClear = (cells: Cell[], settle: StrokeResolve, lockColor = -1, payout = 0) => {
    if (payout > 0) commitStroke(scoreRoll, payout);
    sim.scoreCommitted = scoreRoll.committed;
    const magicClear = board.classList.contains('is-magic-look');
    stampClearLook(cells.concat(settle.extraCells));
    if (magicClear) spawnScoreFlies(cells);
    gameSfx.clear();
    beginClear(sim, cells, {
      ...settle,
      cellDelay: magicClear ? magicClearDelay(cells) : undefined,
      lockColor,
      fromMagic: magicClear,
    });
    snapRecolorOff(cells.concat(settle.extraCells));
    path = null;
    lastLocal = null;
    extraKeys.clear();
    convertPreview = [];
    pendingConvert = null;
    lastDipHover = null;
    paintConvertCount(0, null);
    paintPath(null, false);
    paintHud();
    ensureLoop();
  };

  const fireHaptic = (kind: 'press' | 'tick' | 'mark' | 'find') => {
    const h = FEEL.haptic;
    const noteIndex = Math.max(0, (path?.cells.length ?? 1) - 1);
    if (kind === 'find') {
      const gap = h.findGap;
      const dur = Math.max(0.04, h.findContDur);
      const decay = Math.min(1, Math.max(0, h.findDecay));
      const hold = dur * (1 - decay);
      void haptics.playPattern(
        [
          { type: 'transient', relativeTime: 0, intensity: h.findI, sharpness: h.findS },
          {
            type: 'continuous',
            relativeTime: gap,
            duration: dur,
            intensity: h.findContI,
            sharpness: h.findContS,
          },
        ],
        [
          {
            parameterID: 'hapticIntensity',
            relativeTime: gap,
            controlPoints: [
              { relativeTime: 0, parameterValue: h.findContI },
              ...(hold > 0.008 ? [{ relativeTime: hold, parameterValue: h.findContI }] : []),
              { relativeTime: dur, parameterValue: 0 },
            ],
          },
        ],
      );
      return;
    }
    if (kind === 'press') {
      gameSfx.unlock();
      void haptics.playTransient(h.pressI, h.pressS);
      magicSfxArmed = false;
      if (path?.magic) {
        gameSfx.magicEnter();
        magicSfxArmed = true;
      } else gameSfx.press(0);
      return;
    }
    if (kind === 'mark') {
      void haptics.playTransient(h.markI, h.markS);
      gameSfx.mark(Math.max(0, extraKeys.size - 1));
      return;
    }
    void haptics.playTransient(h.tickI, h.tickS);
    if (path?.magic) {
      if (!magicSfxArmed) {
        gameSfx.magicEnter();
        magicSfxArmed = true;
      } else gameSfx.coin();
    } else {
      magicSfxArmed = false;
      gameSfx.tick(noteIndex);
    }
  };

  const finishStroke = () => {
    if (pendingConvert) return;
    if (path && canCommit(path) && stablePathCount(sim, path.cells) >= PATH_MIN) {
      fireHaptic('find');
      const settle = resolveStroke(path, colors, convertPreview);
      const payout = strokeScore(path, settle, coins);
      const gained = strokeCoins(path, colors);
      coins += gained;
      if (!path.magic || gained < 1) setScoreTarget(coinRoll, coins);
      paintHud();
      if (path.magic) sim.colorCount = stepColorCount(sim.colorCount);
      const clearCells = path.cells.concat(settle.extraCells);
      armSpawnBan(sim, path.magic, path.color, clearCells);
      if (settle.extraCells.length) {
        pendingConvert = {
          countdown: startBadgeCount(path.cells),
          settle,
          queue: settle.extraCells.slice(),
          loc: lastLocal ? { x: lastLocal.x, y: lastLocal.y } : { x: 0, y: 0 },
          holding: false,
          holdAcc: 0,
          holdAfter: true,
          lockColor: path.color,
          payout,
        };
        pinCells(sim, clearCells);
        extraKeys.clear();
        lastDipHover = null;
        paintPieces();
        paintHud();
        ensureLoop();
      } else {
        commitClear(path.cells, settle, path.color, payout);
      }
    } else {
      path = null;
      lastLocal = null;
      extraKeys.clear();
      convertPreview = [];
      lastDipHover = null;
      paintConvertCount(0, null);
      paintPath(null, false);
      aimHud(scoreRoll.committed);
    }
  };

  const feedLocal = (loc: { x: number; y: number }) => {
    if (path) return;
    const hit = cellFromLocal(loc.x, loc.y, layout);
    if (hit && colors[hit.row]![hit.col]! >= 0) path = beginPath(hit, colors);
  };

  const onSample = (clientX: number, clientY: number, kind: 'down' | 'move' | 'up') => {
    const loc = gridLocal(clientX, clientY);
    if (!loc) {
      if (kind === 'up') finishStroke();
      return;
    }

    colors = stableColors(sim);

    if (pendingConvert) return;

    if (kind === 'down') {
      lastLocal = loc;
      const hit = cellFromLocal(loc.x, loc.y, layout);
      path = hit && colors[hit.row]![hit.col]! >= 0 ? beginPath(hit, colors) : null;
      if (path) fireHaptic('press');
      paintPath(path, false);
      lastDipHover = hit ? cellKey(hit) : null;
      return;
    }

    const beforeLen = path?.cells.length ?? 0;
    const beforeSel = new Set<string>([...pathKeys, ...extraKeys]);

    if (path) {
      path = trimPath(path, colors);
      if (!path.cells.length) path = null;
    }

    const stepPx = PATH_TRACE_STEP * Math.min(layout.cellW, layout.cellH);
    const aim = path ? lastStep(path) : null;
    const from = lastLocal;
    const pts = from ? pointsAlongAimed(from, loc, aim, layout, stepPx) : [loc];
    lastLocal = loc;

    if (!path) {
      for (const pt of pts) feedLocal(pt);
    } else {
      let a = from ?? pts[0]!;
      for (const pt of pts) {
        path = stepPathCrossing(path, a, pt, layout, colors);
        a = pt;
      }
    }

    if (kind === 'up') {
      finishStroke();
      return;
    }
    const afterLen = path?.cells.length ?? 0;
    if (afterLen !== beforeLen && afterLen > 0) fireHaptic('tick');
    paintPath(path, false);
    const hover = cellFromLocal(loc.x, loc.y, layout);
    if (hover) {
      const k = cellKey(hover);
      const selected = pathKeys.has(k) || extraKeys.has(k);
      if (selected && lastDipHover !== k && beforeSel.has(k)) {
        const piece = sim.slots[hover.row]![hover.col]!.current;
        if (piece && piece.state === 'stable' && (popT.get(piece.id) ?? 0) > 0.45) {
          dipY.set(piece.id, dipY.get(piece.id) ?? 0);
          dipV.set(piece.id, (dipV.get(piece.id) ?? 0) + FEEL.select.dipVel);
        }
      }
      lastDipHover = k;
    } else {
      lastDipHover = null;
    }
  };

  const unbind = bindSwipeInput(board, {
    onSample,
    onTrueCancel: () => {
      if (pendingConvert) return;
      path = null;
      lastLocal = null;
      extraKeys.clear();
      convertPreview = [];
      lastDipHover = null;
      paintConvertCount(0, null);
      paintPath(null, false);
      aimHud(scoreRoll.committed);
    },
  });

  const tickBadgeSize = (dt: number): boolean => {
    const tail = badgeTailCell(pendingConvert ? pendingConvert.countdown.cells : path?.cells);
    let busy = false;
    const ids = new Set(badgeMo.keys());
    for (const id of pathBadgeEls.keys()) ids.add(id);
    for (const id of ids) {
      const live = sim.pieces.get(id);
      if (!live || live.state === 'clearing') {
        badgeMo.delete(id);
        continue;
      }
      const row = live.destRow ?? live.sourceRow;
      const key = `${row},${live.col}`;
      const order = pathOrder.get(key);
      const isTail = badgeIsTail(row, live.col, tail);
      const keep = badgeKeep(pendingConvert?.countdown ?? null, order, isTail, pathKeys.has(key));
      const now = keep && isTail;
      const next = tickBadgeMotion(badgeMo.get(id), badgeTargetPx(keep, now), dt);
      if (!next) badgeMo.delete(id);
      else {
        badgeMo.set(id, next);
        if (next.t < 1) busy = true;
      }
    }
    return busy;
  };

  const tickPressPop = (dt: number): boolean => {
    const step = Math.min(dt, 1 / 30);
    const want = new Set<number>();
    if (path) {
      for (const piece of sim.pieces.values()) {
        if (piece.state === 'clearing') continue;
        const pieceRow = piece.destRow ?? piece.sourceRow;
        if (pathKeys.has(`${pieceRow},${piece.col}`)) want.add(piece.id);
        else if (pendingConvert && extraKeys.has(`${pieceRow},${piece.col}`)) want.add(piece.id);
      }
    }
    let busy = false;
    const ids = new Set(popT.keys());
    for (const id of want) ids.add(id);
    for (const id of ids) {
      const target = want.has(id) ? 1 : 0;
      const live = sim.pieces.get(id);
      if (live?.state === 'clearing') {
        idleT.delete(id);
        popOutFrom.delete(id);
        popOutT.delete(id);
        busy = true;
        continue;
      }
      const extraPick =
        !!pendingConvert &&
        !!live &&
        extraKeys.has(`${(live.destRow ?? live.sourceRow)},${live.col}`) &&
        !pathKeys.has(`${(live.destRow ?? live.sourceRow)},${live.col}`);
      const fresh = !popT.has(id);
      let x = popT.get(id) ?? 0;
      let vel =
        popV.get(id) ?? (fresh && target === 1 ? (extraPick ? FEEL.convert.popVel : FEEL.select.popVel) : 0);

      if (target === 1) {
        popOutFrom.delete(id);
        popOutT.delete(id);
        const spring = extraPick ? FEEL.convert.spring : FEEL.select.spring;
        const damp = extraPick ? FEEL.convert.damp : FEEL.select.damp;
        vel += ((1 - x) * spring - vel * damp) * step;
        x += vel * step;
        if (Math.abs(1 - x) < 0.003 && Math.abs(vel) < 0.03) {
          x = 1;
          vel = 0;
        } else {
          busy = true;
        }
      } else {
        if (!popOutFrom.has(id)) {
          popOutFrom.set(id, x);
          popOutT.set(id, 0);
        }
        const u = Math.min(1, (popOutT.get(id) ?? 0) + step / FEEL.select.outSec);
        popOutT.set(id, u);
        const ease = 1 - (1 - u) * (1 - u);
        x = (popOutFrom.get(id) ?? 0) * (1 - ease);
        vel = 0;
        if (u >= 1) {
          x = 0;
        } else {
          busy = true;
        }
      }

      if (target === 0 && x === 0) {
        popT.delete(id);
        popV.delete(id);
        idleT.delete(id);
        popOutFrom.delete(id);
        popOutT.delete(id);
      } else {
        popT.set(id, x);
        popV.set(id, vel);
        if (target === 1) {
          idleT.set(id, (idleT.get(id) ?? 0) + step);
          busy = true;
        } else {
          idleT.delete(id);
        }
      }
    }
    return busy;
  };

  const tickDip = (dt: number): boolean => {
    const step = Math.min(dt, 1 / 30);
    let busy = false;
    const ids = new Set(dipY.keys());
    for (const id of dipV.keys()) ids.add(id);
    for (const id of ids) {
      let y = dipY.get(id) ?? 0;
      let vel = dipV.get(id) ?? 0;
      vel += (-y * FEEL.select.dipSpring - vel * FEEL.select.dipDamp) * step;
      y += vel * step;
      if (Math.abs(y) < 0.12 && Math.abs(vel) < 1.5) {
        dipY.delete(id);
        dipV.delete(id);
      } else {
        dipY.set(id, y);
        dipV.set(id, vel);
        busy = true;
      }
    }
    return busy;
  };

  const tickDim = (dt: number): boolean => {
    const rate = 1 / FEEL.select.dimSec;
    const step = Math.min(dt, 1 / 30) * rate;
    let busy = false;
    const seen = new Set<number>();
    for (const piece of sim.pieces.values()) {
      seen.add(piece.id);
      const target = pieceShouldDim(path, colors, piece, pathKeys, extraKeys) ? 1 : 0;
      let v = dimK.get(piece.id) ?? 0;
      if (v < target) {
        v = Math.min(target, v + step);
        busy = true;
      } else if (v > target) {
        v = Math.max(target, v - step);
        busy = true;
      }
      if (v <= 0) dimK.delete(piece.id);
      else dimK.set(piece.id, v);
      const shadowTarget = target === 1 ? 0 : 1;
      let s = shadowK.get(piece.id) ?? 1;
      if (s < shadowTarget) {
        s = Math.min(shadowTarget, s + Math.min(dt, 1 / 30) / FEEL.select.shadowInSec);
        busy = true;
      } else if (s > shadowTarget) {
        s = Math.max(shadowTarget, s - Math.min(dt, 1 / 30) / FEEL.select.dimSec);
        busy = true;
      }
      if (s >= 0.995) shadowK.delete(piece.id);
      else shadowK.set(piece.id, s);
    }
    for (const id of dimK.keys()) {
      if (!seen.has(id)) dimK.delete(id);
    }
    for (const id of shadowK.keys()) {
      if (!seen.has(id)) shadowK.delete(id);
    }
    return busy;
  };

  const tickExtraGlow = (dt: number): boolean => {
    const rate = 1 / FEEL.convert.glowSec;
    const step = Math.min(dt, 1 / 30) * rate;
    let busy = false;
    const seen = new Set<number>();
    for (const piece of sim.pieces.values()) {
      seen.add(piece.id);
      const pieceRow = piece.destRow ?? piece.sourceRow;
      const marked = convertPreview.some((c) => c.row === pieceRow && c.col === piece.col);
      const target = marked && !pathKeys.has(`${pieceRow},${piece.col}`) ? 1 : 0;
      let v = extraGlow.get(piece.id) ?? 0;
      if (v < target) {
        v = Math.min(target, v + step);
        busy = true;
      } else if (v > target) {
        v = Math.max(target, v - step);
        busy = true;
      }
      if (v <= 0) extraGlow.delete(piece.id);
      else extraGlow.set(piece.id, v);
    }
    for (const id of extraGlow.keys()) {
      if (!seen.has(id)) extraGlow.delete(id);
    }
    return busy;
  };

  const loop = (ts: number) => {
    const dt = lastTs ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;
    let keep = tickScoreRoll(scoreRoll, dt);
    if (tickScoreRoll(coinRoll, dt)) keep = true;
    if (keep) paintHud();
    if (pendingConvert) {
      if (pendingConvert.holding) {
        pendingConvert.holdAcc += dt;
      } else {
        const picks = stepBadgeCount(pendingConvert.countdown, dt, pendingConvert.queue.length);
        for (let i = 0; i < picks; i++) {
          const cell = pendingConvert.queue.shift();
          if (cell) pickConvertExtra(cell);
        }
      }
      if (!pendingConvert.holding && pendingConvert.countdown.shown <= 0) {
        for (const cell of pendingConvert.queue) pickConvertExtra(cell);
        pendingConvert.queue.length = 0;
        if (!pendingConvert.holdAfter) {
          const job = pendingConvert;
          commitClear(job.countdown.cells, job.settle, job.lockColor, job.payout);
        } else {
          pendingConvert.holding = true;
          pendingConvert.holdAcc = 0;
        }
      }
      if (pendingConvert?.holding && pendingConvert.holdAcc >= FEEL.convert.holdSec) {
        const job = pendingConvert;
        commitClear(job.countdown.cells, job.settle, job.lockColor, job.payout);
      } else if (pendingConvert) {
        keep = true;
      }
    }
    const popping = tickPressPop(dt);
    const badgeSizing = tickBadgeSize(dt);
    const dipping = tickDip(dt);
    const dimming = tickDim(dt);
    const glowing = tickExtraGlow(dt);
    const recoloring = tickRecolor(dt);
    if (tickScoreFlies(dt)) keep = true;
    const dropping = needsTick(sim);
    const js0 = perf.enabled ? performance.now() : 0;
    if (dropping) {
      tickDrop(sim, dt, {
        stride: layout.cellH + layout.spacing,
        pieceH: layout.pieceH,
        dropV0: tune.dropV0,
        dropAccel: tune.dropAccel,
        dropVMax: tune.dropVMax,
        onPieceCleared: (piece) => {
          if (piece.flySec > 0) return;
          if (piece.clearLook === COIN_LOOK) return;
          const shown = piece.clearLook >= 0 ? piece.clearLook : piece.color;
          const popK = popT.get(piece.id) ?? 0;
          const clear = clearMotion(1);
          spawnClearBurst(
            fxLayer,
            pieceLeft(piece.col) + layout.pieceW / 2,
            pieceTop(piece.visualY) +
              piece.offsetY -
              FEEL.select.lift * Math.max(0, popK) -
              clear.lift +
              layout.pieceH / 2,
            shown,
          );
        },
      });
      colors = stableColors(sim);
    }
    const heavy = dropping || !!pendingConvert;
    if (heavy || popping || dimming || dipping || glowing || badgeSizing || recoloring) {
      if (heavy) paintPieces();
      else paintDirtyPieces();
      keep = true;
    }
    if (tickClearFx(dt)) keep = true;
    if (perf.enabled && lastTs && dt > 0) {
      let magicFlip = false;
      let magicCoin = false;
      let magicBack = false;
      let convert = false;
      for (const rec of recolorFx.values()) {
        if (rec.to === COIN_LOOK) {
          if (!rec.done) magicFlip = true;
          else magicCoin = true;
        } else if (rec.from === COIN_LOOK) magicBack = true;
        else if (!rec.done) convert = true;
      }
      const perfScene: PerfScene = scoreFlies.length
        ? 'score_fly'
        : magicBack
          ? 'magic_back'
          : magicFlip
            ? 'magic_flip'
            : magicCoin
              ? 'magic_coin'
              : convert
                ? 'convert'
                : dropping
                  ? 'drop'
                  : 'idle';
      perf.sample(perfScene, {
        frameMs: dt * 1000,
        jsMs: performance.now() - js0,
        imgs: pieceEls.size + coinEls.size + glowEls.size + scoreFlies.length,
        coins: coinEls.size,
        recs: recolorFx.size,
      });
    }
    if (keep) {
      raf = requestAnimationFrame(loop);
      return;
    }
    raf = 0;
    paintHud();
    paintPieces();
  };
  function ensureLoop() {
    if (raf) return;
    lastTs = 0;
    raf = requestAnimationFrame(loop);
  }
  ensureLoop();

  let idleRaf = 0;
  let idleN = 0;
  let idleTs = 0;
  const idleProbe = (ts: number) => {
    if (idleN >= 180) {
      idleRaf = 0;
      return;
    }
    if (!raf && idleTs) {
      const frameMs = ts - idleTs;
      if (frameMs < 200) {
        perf.sample('idle', {
          frameMs,
          jsMs: 0,
          imgs: pieceEls.size + coinEls.size + glowEls.size,
          coins: coinEls.size,
          recs: recolorFx.size,
        });
      }
    }
    idleTs = ts;
    idleN += 1;
    idleRaf = requestAnimationFrame(idleProbe);
  };
  if (perf.enabled) idleRaf = requestAnimationFrame(idleProbe);

  const settings = mountSettings(uiRoot, tune, (next) => {
    tune = next;
    saveTune(tune);
    applyLayout();
  });

  return {
    dispose: () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(idleRaf);
      perf.dispose();
      disposeClearFx();
      unbind();
      board.remove();
      settings.remove();
    },
  };
}

function mountSettings(
  uiRoot: HTMLElement,
  initial: Tune,
  onChange: (tune: Tune) => void,
): HTMLElement {
  const root = document.createElement('div');
  root.id = 'settings-root';
  root.innerHTML = `
    <div class="settings-backdrop" data-close></div>
    <div id="tune-panel">
    <div class="tune-head">
      <p class="tune-title">设置</p>
      <button type="button" class="tune-close" data-close aria-label="关闭">×</button>
    </div>
    <p class="tune-section">HUD</p>
    <label>面板高度<span data-k="hudPanelHeight">${initial.hudPanelHeight}</span>
      <input type="range" data-k="hudPanelHeight" min="72" max="160" step="1" value="${initial.hudPanelHeight}" />
    </label>
    <label>边距/间距<span data-k="hudGutter">${initial.hudGutter}</span>
      <input type="range" data-k="hudGutter" min="6" max="28" step="1" value="${initial.hudGutter}" />
    </label>
    <label>标题字号<span data-k="hudLabelSize">${initial.hudLabelSize}</span>
      <input type="range" data-k="hudLabelSize" min="10" max="22" step="1" value="${initial.hudLabelSize}" />
    </label>
    <label>标题高低<span data-k="hudLabelY">${initial.hudLabelY}</span>
      <input type="range" data-k="hudLabelY" min="-32" max="32" step="1" value="${initial.hudLabelY}" />
    </label>
    <label>分数字号<span data-k="hudScoreSize">${initial.hudScoreSize}</span>
      <input type="range" data-k="hudScoreSize" min="22" max="64" step="1" value="${initial.hudScoreSize}" />
    </label>
    <label>分数高低<span data-k="hudScoreY">${initial.hudScoreY}</span>
      <input type="range" data-k="hudScoreY" min="-32" max="32" step="1" value="${initial.hudScoreY}" />
    </label>
    <label>金币数字上限<span data-k="hudCoinSize">${initial.hudCoinSize}</span>
      <input type="range" data-k="hudCoinSize" min="16" max="48" step="1" value="${initial.hudCoinSize}" />
    </label>
    <label>金币数字宽度<span data-k="hudCoinNumW">${initial.hudCoinNumW}</span>
      <input type="range" data-k="hudCoinNumW" min="16" max="80" step="1" value="${initial.hudCoinNumW}" />
    </label>
    <label>金币数字X<span data-k="hudCoinNumX">${initial.hudCoinNumX}</span>
      <input type="range" data-k="hudCoinNumX" min="-40" max="40" step="1" value="${initial.hudCoinNumX}" />
    </label>
    <label>金币数字Y<span data-k="hudCoinNumY">${initial.hudCoinNumY}</span>
      <input type="range" data-k="hudCoinNumY" min="-40" max="40" step="1" value="${initial.hudCoinNumY}" />
    </label>
    <label>金币图标大小<span data-k="hudCoinIconH">${initial.hudCoinIconH}</span>
      <input type="range" data-k="hudCoinIconH" min="24" max="72" step="1" value="${initial.hudCoinIconH}" />
    </label>
    <label>金币图标X<span data-k="hudCoinIconX">${initial.hudCoinIconX}</span>
      <input type="range" data-k="hudCoinIconX" min="-40" max="40" step="1" value="${initial.hudCoinIconX}" />
    </label>
    <label>金币图标Y<span data-k="hudCoinIconY">${initial.hudCoinIconY}</span>
      <input type="range" data-k="hudCoinIconY" min="-40" max="40" step="1" value="${initial.hudCoinIconY}" />
    </label>
    <label>金币条高低<span data-k="hudCoinBarY">${initial.hudCoinBarY}</span>
      <input type="range" data-k="hudCoinBarY" min="-40" max="40" step="1" value="${initial.hudCoinBarY}" />
    </label>
    <p class="tune-section">棋盘</p>
    <label>棋盘宽<span data-k="visualWidth">${initial.visualWidth}</span>
      <input type="range" data-k="visualWidth" min="260" max="390" step="1" value="${initial.visualWidth}" />
    </label>
    <label>棋盘高<span data-k="visualHeight">${initial.visualHeight}</span>
      <input type="range" data-k="visualHeight" min="260" max="520" step="1" value="${initial.visualHeight}" />
    </label>
    <label>格子间距<span data-k="spacing">${initial.spacing}</span>
      <input type="range" data-k="spacing" min="0" max="12" step="1" value="${initial.spacing}" />
    </label>
    <label>棋子大小<span data-k="pieceSize">${initial.pieceSize}</span>
      <input type="range" data-k="pieceSize" min="16" max="128" step="1" value="${initial.pieceSize}" />
    </label>
    <label>格子大小<span data-k="cellSize">${initial.cellSize}</span>
      <input type="range" data-k="cellSize" min="20" max="128" step="1" value="${initial.cellSize}" />
    </label>
    <label>格子透明度<span data-k="cellOpacity">${initial.cellOpacity}</span>
      <input type="range" data-k="cellOpacity" min="0" max="100" step="1" value="${initial.cellOpacity}" />
    </label>
    <label>初速度<span data-k="dropV0">${initial.dropV0}</span>
      <input type="range" data-k="dropV0" min="80" max="1400" step="20" value="${initial.dropV0}" />
    </label>
    <label>加速度<span data-k="dropAccel">${initial.dropAccel}</span>
      <input type="range" data-k="dropAccel" min="200" max="5000" step="50" value="${initial.dropAccel}" />
    </label>
    <label>速度上限<span data-k="dropVMax">${initial.dropVMax}</span>
      <input type="range" data-k="dropVMax" min="150" max="2500" step="25" value="${initial.dropVMax}" />
    </label>
    <label>Mask内缩<span data-k="maskInset">${initial.maskInset}</span>
      <input type="range" data-k="maskInset" min="0" max="48" step="1" value="${initial.maskInset}" />
    </label>
    <label>Mask圆角<span data-k="maskRadius">${initial.maskRadius}</span>
      <input type="range" data-k="maskRadius" min="0" max="64" step="1" value="${initial.maskRadius}" />
    </label>
    <p class="tune-meta" data-meta></p>
    <button type="button" data-reset>恢复默认</button>
    </div>
  `;
  uiRoot.append(root);

  const btn = document.createElement('button');
  btn.id = 'btn-settings';
  btn.type = 'button';
  btn.setAttribute('aria-label', '设置');
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64L4.86 10.7c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.16a.5.5 0 0 0-.12-.64l1.92 3.32c.14.24.42.34.68.22l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54c.05.24.25.42.49.42h3.8c.24 0 .44-.18.49.42l.36 2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.26.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>';
  uiRoot.append(btn);

  const panel = root.querySelector('#tune-panel')!;
  const hud = uiRoot.querySelector('#hud');
  const open = () => {
    root.classList.add('is-open');
    hud?.classList.add('is-tuning');
  };
  const close = () => {
    root.classList.remove('is-open');
    hud?.classList.remove('is-tuning');
  };
  btn.addEventListener('click', () => {
    if (root.classList.contains('is-open')) close();
    else open();
  });
  root.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));

  const state = { ...initial };

  const meta = panel.querySelector<HTMLElement>('[data-meta]')!;
  const syncMeta = () => {
    const L = computeLayout(state);
    meta.textContent = `${ROWS}×${COLS} · 格 ${Math.round(L.cellW)}×${Math.round(L.cellH)} · 子 ${Math.round(L.pieceW)}×${Math.round(L.pieceH)}`;
  };
  syncMeta();

  const setVal = (key: keyof Tune, n: number) => {
    state[key] = n;
    const label = panel.querySelector(`span[data-k="${key}"]`);
    if (label) label.textContent = String(n);
    const input = panel.querySelector<HTMLInputElement>(`input[data-k="${key}"]`);
    if (input) input.value = String(n);
    syncMeta();
    onChange({ ...state });
  };

  panel.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((input) => {
    input.addEventListener('input', () => {
      const key = input.dataset.k as keyof Tune;
      setVal(key, Number(input.value));
    });
  });

  panel.querySelector('[data-reset]')!.addEventListener('click', () => {
    (Object.keys(TUNE_DEFAULTS) as (keyof Tune)[]).forEach((key) => {
      setVal(key, TUNE_DEFAULTS[key]);
    });
  });

  return root;
}

export { COLS, ROWS };

import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../adapt/design';
import { cellFromLocal, createFilledBoard, type Cell } from './board';
import {
  clearMotion,
  COLS,
  FEEL,
  gatherMotion,
  itemPopMotion,
  convertPopYawSrc,
  FRAME_SLICE,
  PATH_MIN,
  PIECE_SRC,
  ROWS,
  STAGE,
  clampPieceDpr,
  isConvertColor,
  isItemColor,
  isMagicColor,
  pieceDropShadowFilter,
  pieceLayerTransform,
} from './config';
import {
  beginClear,
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
import {
  displayColor,
  extraClearCells,
  pathUsesConvert,
  resolveStroke,
  type StrokeResolve,
} from './items';
import { commitStroke, createScoreRoll, linkPreview, setScoreTarget, strokeScore, tickScoreRoll } from './score';
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
  const sim = createDropSim(createFilledBoard());
  let colors = stableColors(sim);
  let tune = loadTune();
  let layout = computeLayout(tune);

  const hud = uiRoot.querySelector('#hud-score')!;
  const scoreRoll = createScoreRoll();
  const paintHud = () => {
    hud.textContent = String(scoreRoll.displayed);
  };
  const aimHud = (target: number) => {
    setScoreTarget(scoreRoll, target);
    paintHud();
    ensureLoop();
  };
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
  fxLayer.append(convertCountEl);


  const applyLayout = () => {
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
    for (const img of imgPool) setPieceBitmapSize(img);
    paintPieces();
  };

  const pieceEls = new Map<number, HTMLImageElement>();
  const glowEls = new Map<number, HTMLImageElement>();
  const imgPool: HTMLImageElement[] = [];
  const cellEls: HTMLDivElement[][] = [];
  const lastPath: HTMLDivElement[] = [];
  const pathKeys = new Set<string>();
  const extraKeys = new Set<string>();
  const popT = new Map<number, number>();
  const popV = new Map<number, number>();
  const idleT = new Map<number, number>();
  const popOutFrom = new Map<number, number>();
  const popOutT = new Map<number, number>();
  const dimK = new Map<number, number>();
  const extraGlow = new Map<number, number>();
  const dipY = new Map<number, number>();
  const dipV = new Map<number, number>();

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

  const acquireImg = (): HTMLImageElement => {
    const pooled = imgPool.pop();
    if (pooled) {
      pooled.hidden = false;
      return pooled;
    }
    const el = document.createElement('img');
    el.className = 'board-piece';
    el.alt = '';
    el.draggable = false;
    el.decoding = 'async';
    movers.append(el);
    return el;
  };

  const acquireGlow = (): HTMLImageElement => {
    const el = acquireImg();
    el.classList.add('is-additive-glow');
    return el;
  };

  const releaseImg = (el: HTMLImageElement) => {
    el.classList.remove('is-additive-glow', 'is-dim', 'is-clearing', 'is-convert', 'is-magic', 'is-lifted');
    el.hidden = true;
    el.style.opacity = '';
    el.style.filter = '';
    el.style.zIndex = '';
    el.style.transform = 'translate3d(-9999px,0,0)';
    el.dataset.color = '';
    el.dataset.src = '';
    imgPool.push(el);
  };

  const pieceDpr = () => clampPieceDpr(window.devicePixelRatio || 1);

  const setPieceBitmapSize = (el: HTMLImageElement) => {
    const dpr = pieceDpr();
    el.style.width = `${layout.pieceW * dpr}px`;
    el.style.height = `${layout.pieceH * dpr}px`;
    el.style.filter = pieceDropShadowFilter(dpr);
  };

  const pieceLeft = (col: number) =>
    col * (layout.cellW + layout.spacing) + (layout.cellW - layout.pieceW) / 2;
  const pieceTop = (y: number) =>
    y * (layout.cellH + layout.spacing) + (layout.cellH - layout.pieceH) / 2;

  const syncPieceEl = (piece: Piece): HTMLImageElement => {
    let el = pieceEls.get(piece.id);
    if (!el) {
      el = acquireImg();
      pieceEls.set(piece.id, el);
    }
    const shown = displayColor(piece.color, board.classList.contains('is-magic-look'));
    const poppingIn = piece.itemPopSec > 0 && piece.itemPopT < piece.itemPopSec;
    const popU = piece.itemPopSec > 0 ? piece.itemPopT / piece.itemPopSec : 1;
    const popIn =
      piece.itemPopSec > 0 ? itemPopMotion(popU, piece.itemPopAmp) : null;
    const yawSrc =
      poppingIn && isConvertColor(piece.color) && !isMagicColor(shown)
        ? convertPopYawSrc(popU, piece.itemPopAmp)
        : null;
    const src = yawSrc ?? PIECE_SRC[shown]!;
    if (el.dataset.src !== src) {
      el.dataset.src = src;
      el.src = src;
    }
    el.dataset.color = String(shown);
    setPieceBitmapSize(el);
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
    const dimAmt = dimK.get(piece.id) ?? 0;
    const opacity = fade * (1 - dimAmt * (1 - FEEL.select.otherOpacity));
    el.style.opacity = opacity === 1 ? '' : String(opacity);
    const popK = popT.get(piece.id) ?? 0;
    const pieceRowEarly = piece.destRow ?? piece.sourceRow;
    const convertSel =
      !!pendingConvert && extraKeys.has(`${pieceRowEarly},${piece.col}`) && !pathKeys.has(`${pieceRowEarly},${piece.col}`);
    const popS = 1 + (FEEL.select.scale - 1) * popK;
    const idle = idleT.get(piece.id) ?? 0;
    const vel = popV.get(piece.id) ?? 0;
    const settle = Math.max(0, 1 - (Math.abs(popK - 1) + Math.abs(vel) * 0.06) / 0.32);
    const bob =
      piece.state === 'clearing' || poppingIn
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
    const liftY = FEEL.select.lift * Math.max(0, popK) + bob + clearLift + popLift - dip;
    el.style.transform = pieceLayerTransform(
      x,
      y - liftY,
      piece.scaleX * popS * clearS * popScale,
      piece.scaleY * popS * clearS * popScale,
      layout.pieceW,
      layout.pieceH,
      pieceDpr(),
      wobble + popRot,
    );
    el.classList.toggle('is-clearing', piece.state === 'clearing');
    el.classList.toggle('is-convert', isConvertColor(piece.color) && !isMagicColor(shown));
    el.classList.toggle('is-magic', isMagicColor(shown));
    el.classList.toggle('is-dim', dimAmt > 0.02);
    el.classList.toggle('is-lifted', popK > 0);
    const z = gather
      ? 240 + Math.round((1 - k) * 20)
      : piece.state === 'clearing'
        ? 180
        : Math.round(piece.visualY * 20 + popK * 6 + (poppingIn ? 16 : 0));
    el.style.zIndex = String(10 + z);
    const host = piece.visualY < -0.02 && !gather && !poppingIn ? movers : lifts;
    if (el.parentElement !== host) host.append(el);

    const pieceRow = piece.destRow ?? piece.sourceRow;
    const onPath = pathKeys.has(`${pieceRow},${piece.col}`);
    const markG = extraGlow.get(piece.id) ?? 0;
    const glowAmt = fly ? fly.glow : clear ? clear.glow : onPath ? popK : markG;
    let glow = glowEls.get(piece.id);
    const wantGlow = fade > 0.08 && glowAmt > 0.02;
    if (wantGlow) {
      if (!glow) {
        glow = acquireGlow();
        glowEls.set(piece.id, glow);
      }
      if (glow.dataset.src !== src) {
        glow.dataset.src = src;
        glow.src = src;
      }
      glow.dataset.color = String(shown);
      setPieceBitmapSize(glow);
      glow.style.filter = 'none';
      const glowOp = onPath ? FEEL.select.glowOpacity : FEEL.convert.markGlow;
      glow.style.opacity = String(glowOp * fade * glowAmt);
      glow.style.transform = el.style.transform;
      glow.style.zIndex = String(11 + z);
      if (glow.parentElement !== host) host.append(glow);
    } else if (glow) {
      glow.classList.remove('is-additive-glow');
      releaseImg(glow);
      glowEls.delete(piece.id);
    }
    return el;
  };

  const paintPieces = () => {
    for (const piece of sim.pieces.values()) syncPieceEl(piece);
    for (const [id, el] of pieceEls) {
      if (sim.pieces.has(id)) continue;
      releaseImg(el);
      pieceEls.delete(id);
    }
    for (const [id, el] of glowEls) {
      if (sim.pieces.has(id) && pathKeys.size) continue;
      el.classList.remove('is-additive-glow');
      releaseImg(el);
      glowEls.delete(id);
    }
  };

  let path: PathState | null = null;
  let lastLocal: { x: number; y: number } | null = null;
  let lastDipHover: string | null = null;
  let convertPreview: Cell[] = [];
  let pendingConvert: {
    cells: Cell[];
    settle: StrokeResolve;
    queue: Cell[];
    shown: number;
    acc: number;
    loc: { x: number; y: number };
    holding: boolean;
    convertAt: Cell | null;
  } | null = null;
  applyLayout();

  let convertCountOn = false;
  const paintConvertCount = (n: number, loc: { x: number; y: number } | null) => {
    if (n > 0 && loc) {
      convertCountEl.textContent = String(n);
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
    extraKeys.clear();
    const magicLook = !!next?.magic;
    if (board.classList.contains('is-magic-look') !== magicLook) {
      board.classList.toggle('is-magic-look', magicLook);
    }
    if (next) {
      next.cells.forEach((cell, i) => {
        pathKeys.add(`${cell.row},${cell.col}`);
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
    if (!pendingConvert) {
      const show =
        next && pathUsesConvert(next, colors) ? next.cells.length : 0;
      paintConvertCount(show, lastLocal);
    }
    paintPieces();
    ensureLoop();
  };

  const hopConvert = () => {
    const at = pendingConvert?.convertAt;
    if (!at) return;
    const piece = sim.slots[at.row]![at.col]!.current;
    if (!piece || piece.state === 'clearing') return;
    dipY.set(piece.id, dipY.get(piece.id) ?? 0);
    dipV.set(piece.id, (dipV.get(piece.id) ?? 0) + FEEL.select.dipVel);
  };

  const pickConvertExtra = (cell: Cell) => {
    extraKeys.add(`${cell.row},${cell.col}`);
    hopConvert();
  };

  const commitClear = (cells: Cell[], settle: StrokeResolve) => {
    beginClear(sim, cells, settle);
    void haptics.impact('medium');
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

  const finishStroke = () => {
    if (pendingConvert) return;
    if (path && canCommit(path) && stablePathCount(sim, path.cells) >= PATH_MIN) {
      const settle = resolveStroke(path, colors, convertPreview);
      commitStroke(scoreRoll, strokeScore(path, colors, settle));
      if (settle.extraCells.length && lastLocal) {
        pendingConvert = {
          cells: path.cells.map((c) => ({ row: c.row, col: c.col })),
          settle,
          queue: settle.extraCells.slice(),
          shown: path.cells.length,
          acc: 0,
          loc: { x: lastLocal.x, y: lastLocal.y },
          holding: false,
          convertAt: path.cells.find((c) => {
            const p = sim.slots[c.row]![c.col]!.current;
            return !!p && isConvertColor(p.color);
          }) ?? null,
        };
        extraKeys.clear();
        lastDipHover = null;
        paintConvertCount(pendingConvert.shown, pendingConvert.loc);
        paintPieces();
        paintHud();
        ensureLoop();
      } else {
        commitClear(path.cells, settle);
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
      paintPath(path, false);
      lastDipHover = hit ? cellKey(hit) : null;
      aimHud(scoreRoll.committed + (path ? linkPreview(path.cells.length) : 0));
      return;
    }

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
    aimHud(scoreRoll.committed + (path ? linkPreview(path.cells.length) : 0));
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

  const pieceShouldDim = (piece: Piece): boolean => {
    if (!path || path.magic || piece.state === 'clearing') return false;
    const pieceRow = piece.destRow ?? piece.sourceRow;
    if (pathKeys.has(`${pieceRow},${piece.col}`)) return false;
    if (extraKeys.has(`${pieceRow},${piece.col}`)) return false;
    if (path.color < 0) return true;
    if (isItemColor(piece.color)) return false;
    return piece.color !== path.color;
  };

  const tickDim = (dt: number): boolean => {
    const rate = 1 / FEEL.select.dimSec;
    const step = Math.min(dt, 1 / 30) * rate;
    let busy = false;
    const seen = new Set<number>();
    for (const piece of sim.pieces.values()) {
      seen.add(piece.id);
      const target = pieceShouldDim(piece) ? 1 : 0;
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
    }
    for (const id of dimK.keys()) {
      if (!seen.has(id)) dimK.delete(id);
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
    if (keep) paintHud();
    if (pendingConvert) {
      pendingConvert.acc += dt;
      const tick = FEEL.convert.tickSec;
      while (pendingConvert.shown > 0 && pendingConvert.acc >= tick) {
        pendingConvert.acc -= tick;
        pendingConvert.shown -= 1;
        const cell = pendingConvert.queue.shift();
        if (cell) pickConvertExtra(cell);
        paintConvertCount(pendingConvert.shown, pendingConvert.loc);
      }
      if (pendingConvert.shown <= 0) {
        for (const cell of pendingConvert.queue) pickConvertExtra(cell);
        pendingConvert.queue.length = 0;
        if (!pendingConvert.holding) {
          pendingConvert.holding = true;
          pendingConvert.acc = 0;
        }
      }
      if (pendingConvert.holding && pendingConvert.acc >= FEEL.convert.holdSec) {
        const job = pendingConvert;
        commitClear(job.cells, job.settle);
      } else {
        keep = true;
      }
    }
    const popping = tickPressPop(dt);
    const dipping = tickDip(dt);
    const dimming = tickDim(dt);
    const glowing = tickExtraGlow(dt);
    const dropping = needsTick(sim);
    if (dropping) {
      tickDrop(sim, dt, {
        stride: layout.cellH + layout.spacing,
        pieceH: layout.pieceH,
        dropV0: tune.dropV0,
        dropAccel: tune.dropAccel,
        dropVMax: tune.dropVMax,
        onPieceCleared: (piece) => {
          if (piece.flySec > 0) return;
          const shown = displayColor(piece.color, board.classList.contains('is-magic-look'));
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
    if (dropping || popping || dimming || dipping || glowing) {
      paintPieces();
      keep = true;
    }
    if (tickClearFx(dt)) keep = true;
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

  const settings = mountSettings(uiRoot, tune, (next) => {
    tune = next;
    saveTune(tune);
    applyLayout();
  });

  return {
    dispose: () => {
      cancelAnimationFrame(raf);
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

  const panel = root.querySelector('#tune-panel')!;
  const open = () => root.classList.add('is-open');
  const close = () => root.classList.remove('is-open');
  uiRoot.querySelector('#btn-settings')?.addEventListener('click', open);
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
    setVal('visualWidth', TUNE_DEFAULTS.visualWidth);
    setVal('visualHeight', TUNE_DEFAULTS.visualHeight);
    setVal('spacing', TUNE_DEFAULTS.spacing);
    setVal('pieceSize', TUNE_DEFAULTS.pieceSize);
    setVal('cellSize', TUNE_DEFAULTS.cellSize);
    setVal('cellOpacity', TUNE_DEFAULTS.cellOpacity);
    setVal('dropV0', TUNE_DEFAULTS.dropV0);
    setVal('dropAccel', TUNE_DEFAULTS.dropAccel);
    setVal('dropVMax', TUNE_DEFAULTS.dropVMax);
    setVal('maskInset', TUNE_DEFAULTS.maskInset);
    setVal('maskRadius', TUNE_DEFAULTS.maskRadius);
  });

  return root;
}

export { COLS, ROWS };

import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../adapt/design';
import { cellFromLocal, createFilledBoard } from './board';
import {
  COLS,
  FRAME_SLICE,
  CONVERT_COLOR,
  ITEM_MIN,
  NUKE_COLOR,
  NUKE_MIN,
  PATH_MIN,
  PIECE_SRC,
  ROWS,
  STAGE,
  clampPieceDpr,
  isConvertColor,
  isItemColor,
  isNukeColor,
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
import { bindSwipeInput } from './input';
import {
  beginPath,
  canCommit,
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
  hud.textContent = '0';

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

    for (const img of pieceEls.values()) setPieceBitmapSize(img);
    for (const img of imgPool) setPieceBitmapSize(img);
    paintPieces();
  };

  const pieceEls = new Map<number, HTMLImageElement>();
  const imgPool: HTMLImageElement[] = [];
  const cellEls: HTMLDivElement[][] = [];
  const lastPath: HTMLDivElement[] = [];

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

  const releaseImg = (el: HTMLImageElement) => {
    el.hidden = true;
    el.style.transform = 'translate3d(-9999px,0,0)';
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
    if (el.dataset.color !== String(piece.color)) {
      el.dataset.color = String(piece.color);
      el.src = PIECE_SRC[piece.color]!;
    }
    setPieceBitmapSize(el);
    const t = piece.state === 'clearing' ? Math.min(1, piece.clearT / CLEAR_SEC) : 0;
    const fade = 1 - t;
    const x = pieceLeft(piece.col);
    const y = pieceTop(piece.visualY) + piece.offsetY;
    el.style.opacity = fade === 1 ? '' : String(fade);
    el.style.transform = pieceLayerTransform(
      x,
      y,
      piece.scaleX * fade,
      piece.scaleY * fade,
      layout.pieceW,
      layout.pieceH,
      pieceDpr(),
    );
    el.classList.toggle('is-clearing', piece.state === 'clearing');
    el.classList.toggle('is-convert', isConvertColor(piece.color));
    el.classList.toggle('is-nuke', isNukeColor(piece.color));
    return el;
  };

  const paintPieces = () => {
    for (const piece of sim.pieces.values()) syncPieceEl(piece);
    for (const [id, el] of pieceEls) {
      if (sim.pieces.has(id)) continue;
      releaseImg(el);
      pieceEls.delete(id);
    }
  };

  applyLayout();

  let path: PathState | null = null;
  let lastLocal: { x: number; y: number } | null = null;
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
    if (!next) return;
    next.cells.forEach((cell, i) => {
      const el = cellEls[cell.row]?.[cell.col];
      if (!el) return;
      el.classList.add('is-path');
      if (ok) el.classList.add('is-path-ok');
      if (i === next.cells.length - 1) el.classList.add('is-path-tail');
      lastPath.push(el);
    });
  };

  const finishStroke = () => {
    if (path && canCommit(path) && stablePathCount(sim, path.cells) >= PATH_MIN) {
      hud.textContent = String(path.cells.length);
      const usedItem = path.cells.some((c) => isItemColor(colors[c.row]![c.col]!));
      const usedNuke = path.cells.some((c) => isNukeColor(colors[c.row]![c.col]!));
      const usedConvert = path.cells.some((c) => isConvertColor(colors[c.row]![c.col]!));
      let spawnColor: number | null = null;
      if (usedNuke) spawnColor = null;
      else if (path.cells.length >= NUKE_MIN) spawnColor = NUKE_COLOR;
      else if (!usedItem && path.cells.length >= ITEM_MIN) spawnColor = CONVERT_COLOR;
      beginClear(sim, path.cells, {
        extraColor: usedConvert && !usedNuke && path.color >= 0 ? path.color : undefined,
        fullBoard: usedNuke && path.cells.length >= NUKE_MIN,
        spawnColor,
      });
      paintPath(null, false);
      paintPieces();
      ensureLoop();
    } else {
      paintPath(null, false);
      hud.textContent = '0';
    }
    path = null;
    lastLocal = null;
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

    if (kind === 'down') {
      lastLocal = loc;
      const hit = cellFromLocal(loc.x, loc.y, layout);
      path = hit && colors[hit.row]![hit.col]! >= 0 ? beginPath(hit, colors) : null;
      paintPath(path, false);
      hud.textContent = path ? String(path.cells.length) : '0';
      return;
    }

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
    hud.textContent = path ? String(path.cells.length) : '0';
  };

  const unbind = bindSwipeInput(board, {
    onSample,
    onTrueCancel: () => {
      path = null;
      lastLocal = null;
      paintPath(null, false);
      hud.textContent = '0';
    },
  });

  const loop = (ts: number) => {
    const dt = lastTs ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;
    if (needsTick(sim)) {
      tickDrop(sim, dt, {
        stride: layout.cellH + layout.spacing,
        pieceH: layout.pieceH,
        dropV0: tune.dropV0,
        dropAccel: tune.dropAccel,
        dropVMax: tune.dropVMax,
      });
      colors = stableColors(sim);
      paintPieces();
      raf = requestAnimationFrame(loop);
      return;
    }
    raf = 0;
    paintPieces();
  };
  const ensureLoop = () => {
    if (raf) return;
    lastTs = 0;
    raf = requestAnimationFrame(loop);
  };
  ensureLoop();

  const settings = mountSettings(uiRoot, tune, (next) => {
    tune = next;
    saveTune(tune);
    applyLayout();
  });

  return {
    dispose: () => {
      cancelAnimationFrame(raf);
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

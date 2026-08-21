import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../adapt/design';
import { cellFromLocal, createFilledBoard } from './board';
import { BOARD_MASK_EXPAND, COLS, FRAME_SLICE, PIECE_SRC, ROWS } from './config';
import {
  beginClear,
  boardBusy,
  CLEAR_SEC,
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
    const top = (DESIGN_HEIGHT - layout.visualHeight) / 2 + 13;

    board.style.left = `${left}px`;
    board.style.top = `${top}px`;
    board.style.width = `${layout.visualWidth}px`;
    board.style.height = `${layout.visualHeight}px`;
    board.style.setProperty('--frame-width', `${layout.frameWidth}px`);
    board.style.setProperty('--frame-slice', String(FRAME_SLICE));
    board.style.setProperty('--cell-w', `${layout.cellW}px`);
    board.style.setProperty('--cell-h', `${layout.cellH}px`);
    board.style.setProperty('--piece-size', `${layout.piece}px`);
    board.style.setProperty('--cell-opacity', String(layout.cellOpacity));

    cells.style.left = `${layout.gridLeft}px`;
    cells.style.top = `${layout.gridTop}px`;
    cells.style.width = `${layout.gridWidth}px`;
    cells.style.height = `${layout.gridHeight}px`;
    cells.style.gridTemplateColumns = `repeat(${COLS}, ${layout.cellW}px)`;
    cells.style.gridTemplateRows = `repeat(${ROWS}, ${layout.cellH}px)`;
    cells.style.gap = `${layout.spacing}px`;

    const inset = Math.max(0, layout.frameWidth - BOARD_MASK_EXPAND);
    mask.style.left = `${inset}px`;
    mask.style.top = `${inset}px`;
    mask.style.width = `${layout.visualWidth - inset * 2}px`;
    mask.style.height = `${layout.visualHeight - inset * 2}px`;

    movers.style.left = `${layout.gridLeft - inset}px`;
    movers.style.top = `${layout.gridTop - inset}px`;
    movers.style.width = `${layout.gridWidth}px`;
    movers.style.height = `${layout.gridHeight}px`;

    for (const img of movers.querySelectorAll<HTMLImageElement>('.board-piece')) {
      img.width = layout.piece;
      img.height = layout.piece;
    }
    paintPieces();
  };

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement('div');
      cell.className = 'board-cell';
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cells.append(cell);
    }
  }

  const pieceEls = new Map<number, HTMLImageElement>();

  const pieceLeft = (col: number) => col * (layout.cellW + layout.spacing) + (layout.cellW - layout.piece) / 2;
  const pieceTop = (y: number) => y * (layout.cellH + layout.spacing) + (layout.cellH - layout.piece) / 2;

  const syncPieceEl = (piece: Piece): HTMLImageElement => {
    let el = pieceEls.get(piece.id);
    if (!el) {
      el = document.createElement('img');
      el.className = 'board-piece';
      el.alt = '';
      el.draggable = false;
      el.src = PIECE_SRC[piece.color]!;
      el.width = layout.piece;
      el.height = layout.piece;
      movers.append(el);
      pieceEls.set(piece.id, el);
    }
    el.style.left = `${pieceLeft(piece.col)}px`;
    el.style.top = `${pieceTop(piece.visualY) + piece.offsetY}px`;
    el.classList.toggle('is-clearing', piece.state === 'clearing');
    const t = piece.state === 'clearing' ? Math.min(1, piece.clearT / CLEAR_SEC) : 0;
    const fade = 1 - t;
    el.style.opacity = String(fade);
    el.style.transform = `scale(${piece.scaleX * fade}, ${piece.scaleY * fade})`;
    return el;
  };

  const paintPieces = () => {
    const live = new Set<number>();
    for (const piece of sim.pieces.values()) {
      live.add(piece.id);
      syncPieceEl(piece);
    }
    for (const [id, el] of pieceEls) {
      if (live.has(id)) continue;
      el.remove();
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
    for (const el of cells.querySelectorAll('.is-path, .is-path-tail, .is-path-ok, .is-hit')) {
      el.classList.remove('is-path', 'is-path-tail', 'is-path-ok', 'is-hit');
    }
    if (!next) return;
    next.cells.forEach((cell, i) => {
      const el = cells.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
      if (!el) return;
      el.classList.add('is-path');
      if (ok) el.classList.add('is-path-ok');
      if (i === next.cells.length - 1) el.classList.add('is-path-tail');
    });
  };

  const finishStroke = () => {
    if (path && canCommit(path) && !boardBusy(sim)) {
      hud.textContent = String(path.cells.length);
      beginClear(sim, path.cells);
      paintPath(null, false);
      paintPieces();
    } else {
      paintPath(null, false);
      if (!boardBusy(sim)) hud.textContent = '0';
    }
    path = null;
    lastLocal = null;
  };

  const feedLocal = (loc: { x: number; y: number }) => {
    if (path) return;
    if (boardBusy(sim)) return;
    const hit = cellFromLocal(loc.x, loc.y, layout);
    if (hit && colors[hit.row]![hit.col]! >= 0) path = beginPath(hit, colors);
  };

  const onSample = (clientX: number, clientY: number, kind: 'down' | 'move' | 'up') => {
    const loc = gridLocal(clientX, clientY);
    if (!loc) {
      if (kind === 'up') finishStroke();
      return;
    }

    if (kind === 'down') {
      if (boardBusy(sim)) return;
      lastLocal = loc;
      const hit = cellFromLocal(loc.x, loc.y, layout);
      colors = stableColors(sim);
      path = hit && colors[hit.row]![hit.col]! >= 0 ? beginPath(hit, colors) : null;
      paintPath(path, false);
      hud.textContent = path ? String(path.cells.length) : '0';
      return;
    }

    if (boardBusy(sim) && !path) return;

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
      if (!boardBusy(sim)) hud.textContent = '0';
    },
  });

  const loop = (ts: number) => {
    const dt = lastTs ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;
    if (needsTick(sim)) {
      tickDrop(sim, dt, {
        stride: layout.cellH + layout.spacing,
        pieceH: layout.piece,
      });
      colors = stableColors(sim);
      paintPieces();
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const panel = mountTune(uiRoot, tune, (next) => {
    tune = next;
    saveTune(tune);
    applyLayout();
  });

  return {
    dispose: () => {
      cancelAnimationFrame(raf);
      unbind();
      board.remove();
      panel.remove();
    },
  };
}

function mountTune(
  uiRoot: HTMLElement,
  initial: Tune,
  onChange: (tune: Tune) => void,
): HTMLElement {
  const panel = document.createElement('div');
  panel.id = 'tune-panel';
  panel.innerHTML = `
    <p class="tune-title">视觉 / 逻辑</p>
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
      <input type="range" data-k="pieceSize" min="16" max="48" step="1" value="${initial.pieceSize}" />
    </label>
    <label>格子大小<span data-k="cellSize">${initial.cellSize}</span>
      <input type="range" data-k="cellSize" min="20" max="56" step="1" value="${initial.cellSize}" />
    </label>
    <label>格子透明度<span data-k="cellOpacity">${initial.cellOpacity}</span>
      <input type="range" data-k="cellOpacity" min="0" max="100" step="1" value="${initial.cellOpacity}" />
    </label>
    <p class="tune-meta" data-meta></p>
    <button type="button" data-reset>恢复默认</button>
  `;
  uiRoot.append(panel);

  const state = { ...initial };

  const meta = panel.querySelector<HTMLElement>('[data-meta]')!;
  const syncMeta = () => {
    const L = computeLayout(state);
    meta.textContent = `逻辑 9×9 · 格 ${L.cellW}px`;
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
  });

  return panel;
}

export { COLS, ROWS };

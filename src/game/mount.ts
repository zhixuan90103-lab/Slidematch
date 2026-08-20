import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../adapt/design';
import { cellFromLocal, createFilledBoard } from './board';
import { COLS, FRAME_SLICE, PIECE_SRC, ROWS } from './config';
import {
  computeLayout,
  loadTune,
  saveTune,
  TUNE_DEFAULTS,
  type Tune,
} from './settings';

export function mountBoard(uiRoot: HTMLElement): { dispose: () => void } {
  const colors = createFilledBoard();
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

    for (const img of cells.querySelectorAll<HTMLImageElement>('.board-piece')) {
      img.width = layout.piece;
      img.height = layout.piece;
    }
  };

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement('div');
      cell.className = 'board-cell';
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      const piece = document.createElement('img');
      piece.className = 'board-piece';
      const color = colors[row]![col]!;
      piece.dataset.color = String(color);
      piece.src = PIECE_SRC[color]!;
      piece.alt = '';
      piece.draggable = false;
      cell.append(piece);
      cells.append(cell);
    }
  }

  applyLayout();

  const onDown = (ev: PointerEvent) => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    const rect = cells.getBoundingClientRect();
    if (rect.width <= 0) return;
    const sx = rect.width / layout.gridWidth;
    const sy = rect.height / layout.gridHeight;
    const x = (ev.clientX - rect.left) / sx;
    const y = (ev.clientY - rect.top) / sy;
    const hit = cellFromLocal(x, y, layout);
    for (const el of cells.querySelectorAll('.is-hit')) el.classList.remove('is-hit');
    if (!hit) return;
    const el = cells.querySelector(`[data-row="${hit.row}"][data-col="${hit.col}"]`);
    el?.classList.add('is-hit');
    ev.preventDefault();
  };

  board.addEventListener('pointerdown', onDown);

  const panel = mountTune(uiRoot, tune, (next) => {
    tune = next;
    saveTune(tune);
    applyLayout();
  });

  return {
    dispose: () => {
      board.removeEventListener('pointerdown', onDown);
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

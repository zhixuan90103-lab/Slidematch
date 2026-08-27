/**
 * 真机帧时/层数日志。无远程后台。
 * 默认关闭。只有 `?debugPerf=1` 才采样、写 sessionStorage、打 console。
 */

export type PerfScene =
  | 'idle'
  | 'convert'
  | 'magic_flip'
  | 'magic_coin'
  | 'magic_back'
  | 'score_fly'
  | 'drop';

export type PerfSample = {
  frameMs: number;
  jsMs: number;
  imgs: number;
  coins: number;
  recs: number;
};

const STORE_KEY = 'slidematch.perfLog';
const STORE_MAX = 40;
const FLUSH_MIN = 4;

export type PerfLine = {
  t: string;
  scene: PerfScene;
  n: number;
  max: number;
  p90: number;
  avg: number;
  jsMax: number;
  imgsMax: number;
  coinsMax: number;
  recsMax: number;
  magicTap: number;
};

const debugPerf = () =>
  typeof location !== 'undefined' && /(?:^|[?&])debugPerf=1(?:&|$)/.test(location.search);

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[i]!;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function loadStore(): PerfLine[] {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PerfLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStore(lines: PerfLine[]) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(lines.slice(-STORE_MAX)));
  } catch {
    /* private mode */
  }
}

export function createPerfLog(uiRoot: HTMLElement): {
  enabled: boolean;
  sample: (scene: PerfScene, s: PerfSample) => void;
  dispose: () => void;
} {
  const enabled = debugPerf();
  if (!enabled) {
    return { enabled, sample: () => {}, dispose: () => {} };
  }

  let scene: PerfScene | null = null;
  let frames: PerfSample[] = [];
  let magicTap = 0;
  let sawMagic = false;
  const panel = document.createElement('pre');
  panel.id = 'perf-log';
  panel.style.cssText =
    'position:absolute;left:8px;bottom:8px;z-index:20;max-width:374px;max-height:160px;overflow:auto;margin:0;padding:6px 8px;border-radius:8px;background:rgba(40,24,32,.72);color:#fff8ef;font:11px/1.35 ui-monospace,Menlo,monospace;pointer-events:auto;white-space:pre-wrap;';
  panel.title = '点一下复制日志';
  panel.addEventListener('click', () => {
    const text = loadStore()
      .map((l) => JSON.stringify(l))
      .join('\n');
    void navigator.clipboard?.writeText(text);
    panel.textContent = `${panel.textContent ?? ''}\n— copied —`;
  });
  uiRoot.append(panel);
  const existing = loadStore();
  if (existing.length) {
    panel.textContent = existing.slice(-6).map(formatLine).join('\n');
  }

  const flush = (next: PerfScene | null) => {
    if (scene && frames.length >= FLUSH_MIN) {
      const frameMs = frames.map((f) => f.frameMs).sort((a, b) => a - b);
      const jsMs = frames.map((f) => f.jsMs).sort((a, b) => a - b);
      const line: PerfLine = {
        t: new Date().toISOString().slice(11, 23),
        scene,
        n: frames.length,
        max: round1(frameMs[frameMs.length - 1]!),
        p90: round1(pct(frameMs, 0.9)),
        avg: round1(frameMs.reduce((a, b) => a + b, 0) / frameMs.length),
        jsMax: round1(jsMs[jsMs.length - 1]!),
        imgsMax: Math.max(...frames.map((f) => f.imgs)),
        coinsMax: Math.max(...frames.map((f) => f.coins)),
        recsMax: Math.max(...frames.map((f) => f.recs)),
        magicTap,
      };
      const hist = loadStore();
      hist.push(line);
      saveStore(hist);
      const text = formatLine(line);
      console.log('[perf]', text, line);
      if (panel) {
        const keep = hist.slice(-8).map(formatLine).join('\n');
        panel.textContent = keep;
      }
    }
    scene = next;
    frames = [];
  };

  return {
    enabled,
    sample(next, s) {
      if (next === 'magic_flip' && !sawMagic) {
        magicTap += 1;
        sawMagic = true;
      }
      if (next !== 'magic_flip' && next !== 'magic_coin') sawMagic = false;
      if (next !== scene) flush(next);
      if (next === 'idle' && frames.length > 180) return;
      if (s.frameMs > 200) return;
      frames.push(s);
    },
    dispose() {
      flush(null);
      panel?.remove();
    },
  };
}

function formatLine(l: PerfLine): string {
  return `${l.t} ${l.scene} n=${l.n} max=${l.max} p90=${l.p90} avg=${l.avg} jsMax=${l.jsMax} imgs=${l.imgsMax} coins=${l.coinsMax} recs=${l.recsMax} tap=${l.magicTap}`;
}

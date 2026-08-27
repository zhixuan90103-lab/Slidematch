/**
 * Product SFX. Pack 3 kalimba is adopted.
 *
 * Engine: one AudioContext, pre-decoded buffer, no new Audio() / fetch on play.
 * First pointerdown must resume() in the same stack as the gesture (see input.ts).
 * If context is still suspended, queue the event and play after resume — never drop it.
 */

export const SFX_PACKS = [
  { id: '1', label: '音效1' },
  { id: '2', label: '音效2' },
  { id: '3', label: '音效3' },
] as const;
export type SfxPackId = (typeof SFX_PACKS)[number]['id'];

type PackTune = {
  sample: string;
  octave: number;
  scaleCells: number;
  tailCents: number;
  lpBase: number;
  lpMax: number;
};

const TUNES: Record<SfxPackId, PackTune> = {
  '1': {
    sample: `${import.meta.env.BASE_URL}sfx/notes/celesta.wav`,
    octave: 0.7,
    scaleCells: 14,
    tailCents: 100,
    lpBase: 1800,
    lpMax: 3800,
  },
  '2': {
    sample: `${import.meta.env.BASE_URL}sfx/notes/xylo_c5.wav`,
    octave: 0.7,
    scaleCells: 14,
    tailCents: 100,
    lpBase: 2000,
    lpMax: 4800,
  },
  '3': {
    sample: `${import.meta.env.BASE_URL}sfx/notes/kalimba.wav`,
    octave: 0.82,
    scaleCells: 14,
    tailCents: 100,
    lpBase: 2100,
    lpMax: 5200,
  },
};

/** 采用：音效3 拇指琴。 */
let pack: SfxPackId = '3';

export function getSfxPack(): SfxPackId {
  return pack;
}

export function setSfxPack(id: SfxPackId): void {
  pack = id;
}

function tune(): PackTune {
  return TUNES[pack];
}

let ctx: AudioContext | null = null;
const buffers = new Map<SfxPackId, AudioBuffer>();
let loading: Promise<void> | null = null;
let lastCoinAt = -1;

function audioCtor(): typeof AudioContext | null {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AC = audioCtor();
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

async function decodeUrl(c: AudioContext, url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  const raw = await res.arrayBuffer();
  return c.decodeAudioData(raw.slice(0));
}

async function loadPack(c: AudioContext, id: SfxPackId): Promise<void> {
  if (buffers.has(id)) return;
  buffers.set(id, await decodeUrl(c, TUNES[id].sample));
}

function kickSilent(c: AudioContext): void {
  const buf = buffers.get(pack);
  if (!buf || c.state !== 'running') return;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = 0.00008;
  src.connect(g);
  g.connect(c.destination);
  src.start();
  src.stop(c.currentTime + 0.03);
}

/** Must run in the pointerdown stack, before path logic. */
export function unlockNoteSfx(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().then(() => kickSilent(c));
  else kickSilent(c);
  if (!buffers.has(pack) && !loading) preloadNoteSfx();
}

export function preloadNoteSfx(): void {
  const c = getCtx();
  if (!c || buffers.has(pack) || loading) return;
  loading = loadPack(c, pack)
    .catch((err) => {
      console.warn('[sfx] preload failed', err);
    })
    .finally(() => {
      loading = null;
    });
}

export function beginSwipeSfx(): void {
  unlockNoteSfx();
}

const RATES = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8];

function scaleRate(degree: number): number {
  const t = tune();
  const step = ((degree % 7) + 7) % 7;
  const oct = Math.floor(degree / 7);
  return RATES[step]! * 2 ** oct * t.octave;
}

function rateForIndex(zeroBasedIndex: number): number {
  const t = tune();
  const n = Math.max(0, zeroBasedIndex);
  const degree = n - 2;
  if (n < t.scaleCells) return scaleRate(degree);
  const span = Math.max(1, 36 - t.scaleCells);
  const u = Math.min(1, (n - (t.scaleCells - 1)) / span);
  return scaleRate(t.scaleCells - 3) * 2 ** ((u * t.tailCents) / 1200);
}

function withEngine(play: (c: AudioContext) => void): void {
  const c = getCtx();
  if (!c) return;
  const run = () => {
    if (c.state === 'suspended') return;
    if (!buffers.has(pack)) return;
    play(c);
  };
  if (!buffers.has(pack)) {
    const load = loading ?? loadPack(c, pack).finally(() => {
      loading = null;
    });
    loading = load;
    void load.then(() => withEngine(play)).catch((err) => {
      console.warn('[sfx] note load failed', err);
    });
    return;
  }
  if (c.state === 'suspended') {
    void c.resume().then(run);
    return;
  }
  run();
}

function playTone(
  c: AudioContext,
  rate: number,
  peak: number,
  attack: number,
  decay: number,
  offset = 0,
): void {
  const buf = buffers.get(pack);
  if (!buf) return;
  const t = tune();
  const now = c.currentTime + offset;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.setValueAtTime(rate, now);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(t.lpMax, t.lpBase + 900 * (rate / t.octave) ** 0.2), now);
  lp.Q.setValueAtTime(0.2, now);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(peak, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
  src.connect(lp);
  lp.connect(g);
  g.connect(c.destination);
  src.start(now);
  src.stop(now + decay + 0.04);
}

export function playNoteForCellIndex(zeroBasedIndex: number): void {
  withEngine((c) => playTone(c, rateForIndex(zeroBasedIndex), 0.52, 0.01, 0.38));
}

export function playFindSfx(fromIndex: number): void {
  playClearSfx(fromIndex);
}

export function playCoinSfx(): void {
  withEngine((c) => {
    const now = c.currentTime;
    if (now - lastCoinAt < 0.055) return;
    lastCoinAt = now;
    const o = tune().octave;
    playTone(c, o * 2, 0.4, 0.006, 0.2);
    playTone(c, o * 2 * (5 / 4), 0.28, 0.006, 0.16, 0.028);
  });
}

export function playMagicSfx(): void {
  withEngine((c) => {
    const b = tune().octave * 0.7;
    playTone(c, b, 0.18, 0.012, 0.4);
    playTone(c, b * (5 / 4), 0.16, 0.012, 0.42, 0.06);
    playTone(c, b * (3 / 2), 0.18, 0.012, 0.46, 0.12);
    playTone(c, b * (5 / 3), 0.15, 0.012, 0.5, 0.18);
  });
}

export function playClearSfx(_fromIndex?: number): void {
  withEngine((c) => {
    const o = tune().octave;
    playTone(c, o, 0.34, 0.012, 0.5);
    playTone(c, o * (5 / 4), 0.3, 0.012, 0.48, 0.07);
    playTone(c, o * (3 / 2), 0.28, 0.012, 0.55, 0.14);
  });
}

/** Named events. Play layer only — path rules stay in mount. */
export const gameSfx = {
  preload: preloadNoteSfx,
  unlock: unlockNoteSfx,
  press: (i: number) => playNoteForCellIndex(i),
  tick: (i: number) => playNoteForCellIndex(i),
  mark: (i: number) => playNoteForCellIndex(i),
  coin: playCoinSfx,
  magicEnter: playMagicSfx,
  clear: playClearSfx,
};
